import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

function getCurrentDir() {
  const __filename = fileURLToPath(import.meta.url);
  return dirname(__filename);
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Helper to inject canonical and update URL meta tags server-side
function injectCanonical(html: string, pathname: string) {
  const BASE = "https://khadmatak.com";
  const href = `${BASE}${pathname || "/"}`;

  let out = html;

  // Update existing og:url
  out = out.replace(
    /(<meta[^>]*property=["']og:url["'][^>]*content=["'])([^"']+)(["'][^>]*>)/i,
    `$1${href}$3`
  );

  // Update existing twitter:url
  out = out.replace(
    /(<meta[^>]*name=["']twitter:url["'][^>]*content=["'])([^"']+)(["'][^>]*>)/i,
    `$1${href}$3`
  );

  // Ensure canonical link exists with correct href
  if (/rel=["']canonical["']/i.test(out)) {
    out = out.replace(
      /(<link[^>]*rel=["']canonical["'][^>]*href=["'])([^"']+)(["'][^>]*>)/i,
      `$1${href}$3`
    );
  } else {
    out = out.replace(
      /<\/head>/i,
      `  <link rel="canonical" href="${href}" />\n</head>`
    );
  }

  return out;
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        getCurrentDir(),
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      let page = await vite.transformIndexHtml(url, template);
      // Inject canonical/URL meta based on request path in dev too
      page = injectCanonical(page, req.path || "/");
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(getCurrentDir(), "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath, {
    maxAge: "1y",
    immutable: true,
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "public, max-age=300, must-revalidate");
      } else if (filePath.endsWith(".json")) {
        res.setHeader("Cache-Control", "public, max-age=300, must-revalidate");
      }
    },
  }));

  // fall through to index.html if the file doesn't exist
  app.use("*", async (req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) {
      return next();
    }

    const indexPath = path.resolve(distPath, "index.html");
    if (!fs.existsSync(indexPath)) {
      return res.sendStatus(404);
    }

    try {
      const html = await fs.promises.readFile(indexPath, "utf-8");
      const page = injectCanonical(html, req.path || "/");
      // Return 200 for SPA routes to allow proper indexing
      res.status(200).set({ "Content-Type": "text/html" }).send(page);
    } catch (e) {
      res.status(500).send("Internal Server Error");
    }
  });
}
