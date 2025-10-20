import express, { type Request, Response, NextFunction } from "express";
import { createServer as createHttpServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

// Redirect www to non-www
app.use((req, res, next) => {
  const host = req.headers.host;
  if (host && host.startsWith('www.')) {
    const newHost = host.replace('www.', '');
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    return res.redirect(301, `${protocol}://${newHost}${req.url}`);
  }
  next();
});

const allowedOrigins = new Set([
  "http://localhost:3000",
  "http://localhost:5000",
  "http://localhost:5173",
  "https://khadmatak.com",
  "http://khadmatak.com",
  "https://www.khadmatak.com",
  "http://www.khadmatak.com",
]);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  }
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://pagead2.googlesyndication.com https://www.google-analytics.com https://googleads.g.doubleclick.net https://ep1.adtrafficquality.google",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
  "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
  "img-src 'self' data: https://khadmatak.com https://www.google-analytics.com",
  "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://ep1.adtrafficquality.google",
  "frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com",
].join("; ");

app.use((req, res, next) => {
  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", contentSecurityPolicy);

  // Cache control headers for static assets
  if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  } else if (req.url.match(/\.(html|json)$/)) {
    res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
  }

  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));

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
  log("Starting application...");
  log(`Environment: ${process.env.NODE_ENV || "development"}`);
  const server = await registerRoutes(app);
  log("Routes registered successfully");

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(
    process.env.PORT ||
      process.env.PLESK_NODE_PORT ||
      process.env.APP_PORT ||
      "5000",
    10
  );
  const host = process.env.HOST || "0.0.0.0";
  log(`Preferred port: ${preferredPort}, Host: ${host}`);

  const findAvailablePort = (startPort: number): Promise<number> => {
    return new Promise((resolve) => {
      const testServer = createHttpServer();
      testServer.listen(startPort, host, () => {
        const addr = testServer.address();
        const port = typeof addr === "object" && addr !== null ? addr.port : startPort;
        testServer.close(() => resolve(port));
      });
      testServer.on("error", (err: any) => {
        if (err.code === "EADDRINUSE") {
          resolve(findAvailablePort(startPort + 1));
        } else {
          resolve(startPort);
        }
      });
    });
  };

  const port = await findAvailablePort(preferredPort);
  log(`Found available port: ${port}`);
  
  server.listen(
    {
      port,
      host,
    },
    () => {
      if (port !== preferredPort) {
        log(`preferred port ${preferredPort} in use, using ${port} instead`);
      }
      log(`✓ Server is running on http://${host}:${port}`);
    }
  );
  
  server.on("error", (err: any) => {
    log(`Server error: ${err.message}`);
  });
})().catch((err) => {
  log(`Fatal error: ${err.message}`);
  process.exit(1);
});
