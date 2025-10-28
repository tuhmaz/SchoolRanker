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

  out = out.replace(
    /(<meta[^>]*property=["']og:url["'][^>]*content=["'])([^"']+)(["'][^>]*>)/i,
    `$1${href}$3`
  );

  out = out.replace(
    /(<meta[^>]*name=["']twitter:url["'][^>]*content=["'])([^"']+)(["'][^>]*>)/i,
    `$1${href}$3`
  );

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

// -----------------------------
// 🧠 Development Mode (Vite Middleware)
// -----------------------------
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

  // ✅ Serve React frontend in dev
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        getCurrentDir(),
        "..",
        "client",
        "index.html"
      );

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );

      let page = await vite.transformIndexHtml(url, template);
      page = injectCanonical(page, req.path || "/");
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

// -----------------------------
// 🚀 Production Mode (Static Serve)
// -----------------------------
export function serveStatic(app: Express) {
  // ✅ المسار الجديد للبناء النهائي
  const distPath = path.resolve(getCurrentDir(), "../../dist/public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `❌ Could not find build directory: ${distPath}\n⚙️  Run "npm run build" first.`
    );
  }

  app.use(
    express.static(distPath, {
      maxAge: "1y",
      immutable: true,
      setHeaders(res, filePath) {
        if (filePath.endsWith(".html") || filePath.endsWith(".json")) {
          res.setHeader(
            "Cache-Control",
            "public, max-age=300, must-revalidate"
          );
        }
        // 🧩 إصلاح MIME-type
        if (filePath.endsWith(".js")) {
          res.type("application/javascript");
        } else if (filePath.endsWith(".css")) {
          res.type("text/css");
        }
      },
    })
  );

  // 🧠 دعم React Router — أي مسار غير API يعيد index.html
  app.use("*", async (req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) return next();

    const indexPath = path.resolve(distPath, "index.html");
    if (!fs.existsSync(indexPath)) return res.sendStatus(404);

    try {
      const html = await fs.promises.readFile(indexPath, "utf-8");
      const page = injectCanonical(html, req.path || "/");
      res.status(200).set({ "Content-Type": "text/html" }).send(page);
    } catch (e) {
      console.error("Error serving index.html:", e);
      res.status(500).send("Internal Server Error");
    }
  });
}
