const fileRepository = require("./schedule-repository");

const driver = (process.env.STORAGE_DRIVER || "file").toLowerCase();

if (driver === "sqlite") {
  module.exports = require("./sqlite-repository");
} else {
  module.exports = {
    ...fileRepository,
    storageDriver: "file"
  };
}
