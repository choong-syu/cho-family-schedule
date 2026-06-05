const path = require("path");
const fileRepository = require("./schedule-repository");

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function countSnapshot(snapshot) {
  return {
    schedules: snapshot.schedules.length,
    deletedSchedules: snapshot.deletedSchedules.length,
    homeworkItems: snapshot.homeworkItems.length,
    children: snapshot.family.children.length,
    guardians: snapshot.family.guardians.length,
    holidays: snapshot.holidays.length,
    templates: Object.keys(snapshot.templates).length
  };
}

const sqliteFile = argValue("--to") || process.env.SQLITE_FILE || path.join(__dirname, "data", "schedule.sqlite");
const dryRun = process.argv.includes("--dry-run");

process.env.SQLITE_FILE = sqliteFile;
const sqliteRepository = require("./sqlite-repository");

const sourceSnapshot = fileRepository.normalizeSnapshot(fileRepository.readSnapshot());
const sourceCounts = countSnapshot(sourceSnapshot);

if (!dryRun) {
  sqliteRepository.writeSnapshot(sourceSnapshot);
}

const targetSnapshot = dryRun ? sourceSnapshot : sqliteRepository.readSnapshot();
const targetCounts = countSnapshot(targetSnapshot);

console.log(JSON.stringify({
  ok: true,
  dryRun,
  sqliteFile,
  source: sourceCounts,
  target: targetCounts
}, null, 2));

sqliteRepository.close();
