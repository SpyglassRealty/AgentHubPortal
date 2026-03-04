import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // Only serve index.html for non-API routes
  app.get("*", (req, res, next) => {
    if (req.path.startsWith('/api')) {
      // Skip to next handler for API routes
      next();
    } else {
      res.sendFile(path.resolve(distPath, "index.html"));
    }
  });
}
