import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
const app = express();

// External server only - no database needed
console.log('[STARTUP] External server only: 165.23.126.88:8888');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Serve APK files with correct content-type
app.get('*.apk', (req, res, next) => {
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', 'attachment');
  next();
});

// Serve Android APK download
app.get('/api/download/android-apk', (req, res) => {
  const apkPath = path.join(__dirname, '../standalone-android-app/app/build/outputs/apk/release/app-release.apk');
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', 'attachment; filename="crm-mobile-app.apk"');
  res.sendFile(apkPath);
});

// Serve Android app download page
app.get('/download-android-app', (req, res) => {
  const downloadPagePath = path.join(__dirname, '../standalone-android-app/download-android-app.html');
  res.sendFile(downloadPagePath);
});

// Serve complete Android app ZIP download
app.get('/api/download/android-app-zip', (req, res) => {
  const zipPath = path.join(__dirname, '../crm-android-app-complete.zip');
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="crm-android-app-complete.zip"');
  res.sendFile(zipPath);
});

// Add session middleware for custom authentication
app.use(session({
  secret: process.env.SESSION_SECRET || 'custom-auth-secret-key-for-crm-system',
  resave: true, // Force session save
  saveUninitialized: true, // Ensure session is created
  rolling: true, // Reset expiry on each request
  cookie: {
    secure: false, // Must be false for HTTP
    httpOnly: false, // Allow JS access for debugging
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax' // Cross-origin handling
  },
  name: 'crm-session' // Simple session name
}));

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

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Employee auth initialization removed - using HTTP authentication

  // Add explicit API route middleware BEFORE registering other routes
  app.all('/api/*', (req, res, next) => {
    console.log(`[API] ${req.method} ${req.originalUrl}`);
    next();
  });

  const server = await registerRoutes(app);

  // Increase timeout for file upload routes
  app.use('/api/http-clients/import', (req, res, next) => {
    req.setTimeout(300000); // 5 minutes
    res.setTimeout(300000);
    next();
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error('[EXPRESS ERROR]:', err);
    
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
    // Don't throw the error - just log it
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
