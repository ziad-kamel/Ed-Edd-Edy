const fs = require("fs");
const path = require("path");

const statusFilePath = path.join(__dirname, "../../bot-status.json");

function updateStatus(statusData) {
  try {
    const currentData = getStatus();
    const newData = {
      ...currentData,
      ...statusData,
      lastUpdate: new Date().toISOString(),
    };
    fs.writeFileSync(statusFilePath, JSON.stringify(newData, null, 2));
  } catch (err) {
    console.error("Error updating status file:", err);
  }
}

function getStatus() {
  try {
    if (fs.existsSync(statusFilePath)) {
      return JSON.parse(fs.readFileSync(statusFilePath, "utf8"));
    }
  } catch (err) {
    console.error("Error reading status file:", err);
  }
  return { status: "disconnected", qr: null };
}

module.exports = {
  updateStatus,
  getStatus,
};
