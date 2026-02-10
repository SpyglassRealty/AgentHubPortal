import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from "passport-google-oauth20";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { nanoid } from "nanoid";

const getOidcConfig = memoize(
  async () => {
    if (!process.env.REPL_ID) {
      return null; // Skip Replit OIDC when not running on Replit
    }
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();
  const isReplitEnvironment = !!config;

  console.log(`[Auth Setup] Replit OIDC configured: ${isReplitEnvironment}`);

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  const registeredStrategies = new Set<string>();

  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName) && config) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  // Google OAuth Strategy
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  console.log(`[Auth Setup] Google OAuth configured: ${!!googleClientId && !!googleClientSecret}`);
  
  if (googleClientId && googleClientSecret) {
    console.log(`[Auth Setup] Registering Google OAuth routes...`);
    // Use passReqToCallback to dynamically set callback URL based on request
    passport.use(
      "google",
      new GoogleStrategy(
        {
          clientID: googleClientId,
          clientSecret: googleClientSecret,
          callbackURL: "/api/auth/google/callback",
          scope: ["profile", "email"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            const userId = `google_${profile.id}`;
            
            console.log(`[Google OAuth] Login attempt - email: ${email}, googleId: ${profile.id}, userId: ${userId}`);
            
            await storage.upsertUser({
              id: userId,
              email: email || null,
              firstName: profile.name?.givenName || profile.displayName?.split(' ')[0] || null,
              lastName: profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || null,
              profileImageUrl: profile.photos?.[0]?.value || null,
            });
            
            console.log(`[Google OAuth] User upserted successfully: ${userId}`);

            const user: any = {
              claims: {
                sub: userId,
                email: email,
                first_name: profile.name?.givenName,
                last_name: profile.name?.familyName,
                profile_image_url: profile.photos?.[0]?.value,
              },
              access_token: accessToken,
              refresh_token: refreshToken,
              expires_at: Math.floor(Date.now() / 1000) + 86400, // 24 hour session
              provider: 'google',
            };

            done(null, user);
          } catch (error) {
            console.error(`[Google OAuth] Error during login:`, error);
            done(error as Error);
          }
        }
      )
    );

    app.get("/api/auth/google", passport.authenticate("google", {
      scope: ["profile", "email"],
      prompt: "select_account",
    }));

    app.get("/api/auth/google/callback", passport.authenticate("google", {
      successRedirect: "/",
      failureRedirect: "/?error=google_auth_failed",
    }));
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Replit OIDC routes (only when running on Replit)
  if (isReplitEnvironment) {
    app.get("/api/login", (req, res, next) => {
      ensureStrategy(req.hostname);
      passport.authenticate(`replitauth:${req.hostname}`, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    });

    app.get("/api/callback", (req, res, next) => {
      ensureStrategy(req.hostname);
      passport.authenticate(`replitauth:${req.hostname}`, {
        successReturnToOrRedirect: "/",
        failureRedirect: "/api/login",
      })(req, res, next);
    });
  } else {
    // Redirect /api/login to Google OAuth when not on Replit
    app.get("/api/login", (req, res) => {
      res.redirect("/api/auth/google");
    });
  }

  app.get("/api/logout", (req, res) => {
    const user = req.user as any;
    const isGoogleUser = user?.provider === 'google';
    
    req.logout(() => {
      req.session.destroy((err) => {
        if (isGoogleUser || !isReplitEnvironment) {
          // Google users or non-Replit environments just redirect to home
          res.redirect("/");
        } else if (config) {
          // Replit OIDC users need to call end session endpoint
          res.redirect(
            client.buildEndSessionUrl(config, {
              client_id: process.env.REPL_ID!,
              post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
            }).href
          );
        }
      });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Google OAuth and Password auth users have a different token structure
  if (user.provider === 'google' || user.provider === 'password') {
    const now = Math.floor(Date.now() / 1000);
    if (now <= user.expires_at) {
      return next();
    }
    // For Google and password users, just extend the session since we don't have refresh token handling
    user.expires_at = Math.floor(Date.now() / 1000) + 3600;
    return next();
  }

  // Replit OIDC users
  if (!user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    if (!config) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
