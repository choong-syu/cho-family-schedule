const http = require("http");
const fs = require("fs");
const path = require("path");
const {
  defaultSnapshot,
  entityPayload,
  normalizeSnapshot,
  readEntity,
  readSnapshot,
  storageDriver,
  updateEntity,
  writeSnapshot
} = require("./repository");

const PORT = Number(process.env.PORT || 8123);
const ROOT = __dirname;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin1234";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml; charset=utf-8"
};

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) reject(new Error("Request body too large"));
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(ROOT, requestedPath));

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "POST" && url.pathname === "/api/admin/login") {
      const body = await readBody(req);
      if (body.password !== ADMIN_PASSWORD) return sendJson(res, 401, { ok: false, message: "invalid password" });
      return sendJson(res, 200, { ok: true, role: "admin", sessionId: `local-${Date.now()}` });
    }

    if (req.method === "GET" && url.pathname === "/api/health") {
      return sendJson(res, 200, { ok: true, storageDriver });
    }

    if (req.method === "GET" && url.pathname === "/api/snapshot") {
      return sendJson(res, 200, normalizeSnapshot(readSnapshot()));
    }

    if (req.method === "PUT" && url.pathname === "/api/snapshot") {
      const snapshot = await readBody(req);
      writeSnapshot(normalizeSnapshot(snapshot));
      return sendJson(res, 200, { ok: true, savedAt: new Date().toISOString() });
    }

    if (req.method === "POST" && url.pathname === "/api/snapshot/reset") {
      const snapshot = defaultSnapshot();
      writeSnapshot(snapshot);
      return sendJson(res, 200, snapshot);
    }

    if (req.method === "GET" && url.pathname === "/api/entities") {
      return sendJson(res, 200, entityPayload(readSnapshot()));
    }

    if (url.pathname.startsWith("/api/entities/")) {
      const collection = url.pathname.replace("/api/entities/", "");
      const snapshot = readSnapshot();

      if (req.method === "GET") {
        const payload = readEntity(snapshot, collection);
        if (payload === undefined) return sendJson(res, 404, { ok: false, message: "unknown entity collection" });
        return sendJson(res, 200, payload);
      }

      if (req.method === "PUT") {
        const body = await readBody(req);
        const next = updateEntity(snapshot, collection, body);
        if (!next) return sendJson(res, 404, { ok: false, message: "unknown entity collection" });
        writeSnapshot(next);
        return sendJson(res, 200, { ok: true, savedAt: new Date().toISOString(), [collection]: readEntity(next, collection) });
      }
    }

    serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { ok: false, message: error.message });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`조씨네 일정 server running at http://127.0.0.1:${PORT}/`);
});
