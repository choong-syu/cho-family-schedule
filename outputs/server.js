const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 8123);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const SNAPSHOT_FILE = path.join(DATA_DIR, "snapshot.json");
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

function defaultSnapshot() {
  return {
    schedules: [
      { id: "s1", child: "민지", title: "학교", time: "08:30 - 13:20", start: 90, dur: 210, lane: 0, type: "school", drop: "엄마", pick: "이모" },
      { id: "s2", child: "준호", title: "학교", time: "08:40 - 13:10", start: 95, dur: 205, lane: 1, type: "school", drop: "아빠", pick: "엄마" },
      { id: "s3", child: "서윤", title: "학교", time: "09:00 - 12:50", start: 110, dur: 185, lane: 2, type: "school", drop: "이모", pick: "엄마" },
      { id: "s4", child: "준호", title: "태권도", time: "15:20 - 16:20", start: 365, dur: 60, lane: 1, type: "academy", drop: "아빠", pick: "아빠" },
      { id: "s5", child: "민지", title: "피아노 숙제", time: "16:10 - 16:30", start: 415, dur: 30, lane: 0, type: "homework", drop: "엄마", pick: "아빠", changed: true },
      { id: "s6", child: "서윤", title: "저녁 식사", time: "18:20 - 19:00", start: 555, dur: 44, lane: 2, type: "meal", drop: "엄마", pick: "엄마" },
      { id: "s7", child: "민지", title: "여가시간", time: "20:00 - 20:35", start: 660, dur: 42, lane: 0, type: "leisure", drop: "가족", pick: "가족" }
    ],
    placedHomeworkIds: [],
    completedHomeworkIds: [],
    family: {
      children: [
        { name: "민지", color: "#ffe07b", initial: "민" },
        { name: "준호", color: "#8bd7c8", initial: "준" },
        { name: "서윤", color: "#ffa18e", initial: "서" }
      ],
      guardians: ["엄마", "아빠", "이모"]
    },
    holidays: [],
    templates: {
      school: { type: "school", title: "학교", start: 90, dur: 210, child: "민지", drop: "엄마", pick: "이모", weekdays: ["월", "화", "수", "목", "금"], holidaySkip: true, lane: 0 },
      academy: { type: "academy", title: "학원", start: 570, dur: 60, child: "준호", drop: "아빠", pick: "아빠", weekdays: ["화", "목"], holidaySkip: true, lane: 1 },
      homework: { type: "homework", title: "숙제", start: 600, dur: 30, child: "민지", drop: "엄마", pick: "엄마", weekdays: ["월", "화", "수", "목", "금"], holidaySkip: false, lane: 0 }
    }
  };
}

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

function readSnapshot() {
  if (!fs.existsSync(SNAPSHOT_FILE)) return defaultSnapshot();
  return JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf8"));
}

function writeSnapshot(snapshot) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2), "utf8");
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

    if (req.method === "GET" && url.pathname === "/api/snapshot") {
      return sendJson(res, 200, readSnapshot());
    }

    if (req.method === "PUT" && url.pathname === "/api/snapshot") {
      const snapshot = await readBody(req);
      writeSnapshot(snapshot);
      return sendJson(res, 200, { ok: true, savedAt: new Date().toISOString() });
    }

    if (req.method === "POST" && url.pathname === "/api/snapshot/reset") {
      const snapshot = defaultSnapshot();
      writeSnapshot(snapshot);
      return sendJson(res, 200, snapshot);
    }

    serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { ok: false, message: error.message });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`조씨네 일정 server running at http://127.0.0.1:${PORT}/`);
});
