import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import path from "path";
import { serveStatic } from "./static";
import { createServer } from "http";
import { initializeScheduler, runStartupTasks } from "./scheduler";
import { refreshFubDbConfig } from "./fubClient";
import { initializeDatabase, migrateMarketPulseSnapshots } from "./db";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: '50mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// SEO-MC-NOINDEX — Block search indexing on admin CMS
app.use((_req, res, next) => {
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  next();
});

app.get("/robots.txt", (_req, res) => {
  res.type("text/plain").send("User-agent: *\nDisallow: /\n");
});

// Serve static files from public directory with proper options
app.use(express.static(path.join(process.cwd(), 'public'), {
  maxAge: '1d',
  setHeaders: (res, path) => {
    if (path.includes('/agent-photos/')) {
      res.set('Cache-Control', 'public, max-age=31536000'); // 1 year for agent photos
    }
  }
}));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// Security headers — CSP in Report-Only mode (logs violations, never blocks)
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      reportOnly: true,
      directives: {
        // default-src: inherited → 'self'
        // base-uri: inherited → 'self'
        // object-src: inherited → 'none'
        // font-src: inherited → 'self' https: data:
        // script-src-attr: inherited → 'none'

        "script-src": ["'self'", "'unsafe-inline'"],

        "style-src": ["'self'", "'unsafe-inline'"],

        "img-src": [
          "'self'",
          "data:",
          "https://api.mapbox.com",
          "https://img.youtube.com",
          "https://images.unsplash.com",
          "https://via.placeholder.com",
          "https://www.greatschools.org",
          "https://cdn.repliers.io",
          "https://*.public.blob.vercel-storage.com",
        ],

        "connect-src": [
          "'self'",
          "https://api.mapbox.com",
          "https://events.mapbox.com",
        ],

        "frame-src": [
          "'self'",
          "https://beacon.realtyhack.com",
          "https://docs.google.com",
          "https://www.youtube.com",
          "https://player.vimeo.com",
          "https://mission-control-contract-conduit.onrender.com",
          "https://*.replit.app",
        ],

        "worker-src": ["'self'", "blob:"],
      },
    },
  })
);

// CORS — restrict to known origins
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      'https://missioncontrol-tjfm.onrender.com',
      'https://spyglass-idx.vercel.app',
      'https://spyglassrealty.com',
      'https://www.spyglassrealty.com',
    ];
    if (!origin || allowed.includes(origin) ||
        /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

(async () => {
  // --- Rate Limiting (3 tiers) ---

  // Tier 1: Auth limiter (strictest) — 10 req / 15min per IP
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many login attempts, please try again later" },
  });

  // Tier 2: Proxy limiter (moderate) — 60 req / 1min per IP
  const proxyLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests, please slow down" },
  });

  // Tier 3: General limiter (baseline) — 200 req / 1min per IP
  const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Rate limit exceeded" },
  });

  app.use(generalLimiter);
  app.use("/api/auth/google", authLimiter);
  app.use("/api/fub", proxyLimiter);
  app.use("/api/rezen", proxyLimiter);
  app.use("/api/market-pulse", proxyLimiter);
  app.use("/api/market-pulse/test", proxyLimiter);
  app.use("/api/company-listings", proxyLimiter);
  app.use("/api/idx/leads/webhook", proxyLimiter);

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    async () => {
      log(`serving on port ${port}`);
      
      // Environment variable debug logging
      console.log(`[STARTUP DEBUG] IDX_GRID_API_KEY: ${process.env.IDX_GRID_API_KEY ? 'SET (length: ' + process.env.IDX_GRID_API_KEY.length + ')' : 'NOT SET'}`);
      
      // Initialize database schema first
      await initializeDatabase();
      
      // Force market pulse migration with explicit error handling
      try {
        console.log('[STARTUP] Running explicit market pulse migration...');
        await migrateMarketPulseSnapshots();
        console.log('[STARTUP] Market pulse migration completed successfully');
      } catch (error) {
        console.error('[STARTUP] CRITICAL: Market pulse migration failed:', error);
        // Continue startup but log the error
      }
      
      // Load DB-stored integration keys into cache
      await refreshFubDbConfig();
      
      initializeScheduler();
      
      await runStartupTasks();
    },
  );
})();
