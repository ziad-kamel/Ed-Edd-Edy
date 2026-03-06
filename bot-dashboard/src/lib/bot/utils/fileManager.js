const fs = require("fs");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const path = require("path");
const crypto = require("crypto");
const config = require("../config/config");

function getHash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function isDuplicate(buffer) {
  if (!fs.existsSync(config.downloadDir)) return false;

  const incomingHash = getHash(buffer);
  const files = fs.readdirSync(config.downloadDir);

  for (const file of files) {
    const filePath = path.join(config.downloadDir, file);
    if (fs.lstatSync(filePath).isFile()) {
      const existingBuffer = fs.readFileSync(filePath);
      if (getHash(existingBuffer) === incomingHash) {
        return true;
      }
    }
  }
  return false;
}

async function saveIncomingPDF(msg, sock) {
  const doc = msg.message.documentMessage;
  if (doc?.mimetype !== "application/pdf") return null;

  // Resolve download path relative to project root (or as specified in config)
  const downloadDir = path.isAbsolute(config.downloadDir)
    ? config.downloadDir
    : path.resolve(process.cwd(), "..", config.downloadDir);

  const buffer = await downloadMediaMessage(
    msg,
    "buffer",
    {},
    {
      logger: console,
      reuploadRequest: sock.updateMediaMessage,
    },
  );

  // Duplicate check - Compare actual file content (SHA-256)
  if (isDuplicateWithDir(buffer, downloadDir)) {
    const log = "the file sent before (duplicate skipped)";
    if (global.addBotLog) global.addBotLog(log);
    else console.log(log);
    return "DUPLICATE";
  }

  const logDown = `Downloading PDF: ${doc.fileName || "unnamed"}...`;
  if (global.addBotLog) global.addBotLog(logDown);
  else console.log(logDown);

  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }

  const fileName = doc.fileName || `recived_${Date.now()}.pdf`;
  const filePath = path.join(downloadDir, fileName);

  fs.writeFileSync(filePath, buffer);
  const logSaved = `File saved successfullly: ${filePath}`;
  if (global.addBotLog) global.addBotLog(logSaved);
  else console.log(logSaved);
  return filePath;
}

function isDuplicateWithDir(buffer, downloadDir) {
  if (!fs.existsSync(downloadDir)) return false;

  const incomingHash = getHash(buffer);
  const files = fs.readdirSync(downloadDir);

  for (const file of files) {
    const filePath = path.join(downloadDir, file);
    if (fs.lstatSync(filePath).isFile()) {
      const existingBuffer = fs.readFileSync(filePath);
      if (getHash(existingBuffer) === incomingHash) {
        return true;
      }
    }
  }
  return false;
}

function getLocalFileBuffer(filePath) {
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath);
  }
  return null;
}

module.exports = {
  saveIncomingPDF,
  getLocalFileBuffer,
};
