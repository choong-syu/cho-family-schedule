const path = require("path");
const fs = require("fs");
const { DatabaseSync } = require("node:sqlite");
const {
  defaultSnapshot,
  entityPayload,
  normalizeSnapshot,
  readEntity,
  updateEntity
} = require("./schedule-repository");

const SQLITE_FILE = process.env.SQLITE_FILE || path.join(__dirname, "data", "schedule.sqlite");

let db;

function database() {
  if (db) return db;
  fs.mkdirSync(path.dirname(SQLITE_FILE), { recursive: true });
  db = new DatabaseSync(SQLITE_FILE);
  db.exec(`
    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      deleted INTEGER NOT NULL DEFAULT 0,
      payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS homework_items (
      id TEXT PRIMARY KEY,
      placed INTEGER NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 0,
      payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS children (
      name TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL,
      payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS guardians (
      name TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS holidays (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS templates (
      type TEXT PRIMARY KEY,
      payload TEXT NOT NULL
    );
  `);
  return db;
}

function parseJson(value) {
  return JSON.parse(value);
}

function tableIsEmpty(tableName) {
  return database().prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get().count === 0;
}

function ensureSeeded() {
  if (!tableIsEmpty("schedules")) return;
  writeSnapshot(defaultSnapshot());
}

function readSnapshot() {
  ensureSeeded();
  const conn = database();
  const schedules = conn
    .prepare("SELECT payload FROM schedules WHERE deleted = 0 ORDER BY json_extract(payload, '$.start'), id")
    .all()
    .map(row => parseJson(row.payload));
  const deletedSchedules = conn
    .prepare("SELECT payload FROM schedules WHERE deleted = 1 ORDER BY json_extract(payload, '$.deletedAt') DESC, id")
    .all()
    .map(row => parseJson(row.payload));
  const homeworkRows = conn.prepare("SELECT id, placed, completed, payload FROM homework_items ORDER BY id").all();
  const children = conn
    .prepare("SELECT payload FROM children ORDER BY sort_order, name")
    .all()
    .map(row => parseJson(row.payload));
  const guardians = conn
    .prepare("SELECT name FROM guardians ORDER BY sort_order, name")
    .all()
    .map(row => row.name);
  const holidays = conn
    .prepare("SELECT payload FROM holidays ORDER BY json_extract(payload, '$.date'), id")
    .all()
    .map(row => parseJson(row.payload));
  const templates = Object.fromEntries(
    conn.prepare("SELECT type, payload FROM templates ORDER BY type").all().map(row => [row.type, parseJson(row.payload)])
  );

  return normalizeSnapshot({
    schedules,
    deletedSchedules,
    homeworkItems: homeworkRows.map(row => parseJson(row.payload)),
    placedHomeworkIds: homeworkRows.filter(row => row.placed).map(row => row.id),
    completedHomeworkIds: homeworkRows.filter(row => row.completed).map(row => row.id),
    family: { children, guardians },
    holidays,
    templates
  });
}

function writeSnapshot(snapshot) {
  const data = normalizeSnapshot(snapshot);
  const conn = database();
  conn.exec("BEGIN IMMEDIATE");
  try {
    conn.exec(`
      DELETE FROM schedules;
      DELETE FROM homework_items;
      DELETE FROM children;
      DELETE FROM guardians;
      DELETE FROM holidays;
      DELETE FROM templates;
    `);

    const insertSchedule = conn.prepare("INSERT INTO schedules (id, deleted, payload) VALUES (?, ?, ?)");
    data.schedules.forEach(item => insertSchedule.run(item.id, 0, JSON.stringify(item)));
    data.deletedSchedules.forEach(item => insertSchedule.run(item.id, 1, JSON.stringify(item)));

    const placed = new Set(data.placedHomeworkIds);
    const completed = new Set(data.completedHomeworkIds);
    const insertHomework = conn.prepare("INSERT INTO homework_items (id, placed, completed, payload) VALUES (?, ?, ?, ?)");
    data.homeworkItems.forEach(item => {
      insertHomework.run(item.id, placed.has(item.id) ? 1 : 0, completed.has(item.id) ? 1 : 0, JSON.stringify(item));
    });

    const insertChild = conn.prepare("INSERT INTO children (name, sort_order, payload) VALUES (?, ?, ?)");
    data.family.children.forEach((child, index) => insertChild.run(child.name, index, JSON.stringify(child)));

    const insertGuardian = conn.prepare("INSERT INTO guardians (name, sort_order) VALUES (?, ?)");
    data.family.guardians.forEach((guardian, index) => insertGuardian.run(guardian, index));

    const insertHoliday = conn.prepare("INSERT INTO holidays (id, payload) VALUES (?, ?)");
    data.holidays.forEach(item => insertHoliday.run(item.id, JSON.stringify(item)));

    const insertTemplate = conn.prepare("INSERT INTO templates (type, payload) VALUES (?, ?)");
    Object.entries(data.templates).forEach(([type, item]) => insertTemplate.run(type, JSON.stringify(item)));

    conn.exec("COMMIT");
  } catch (error) {
    conn.exec("ROLLBACK");
    throw error;
  }
}

function close() {
  if (!db) return;
  db.close();
  db = undefined;
}

module.exports = {
  close,
  defaultSnapshot,
  entityPayload,
  normalizeSnapshot,
  readEntity,
  readSnapshot,
  storageDriver: "sqlite",
  updateEntity,
  writeSnapshot
};
