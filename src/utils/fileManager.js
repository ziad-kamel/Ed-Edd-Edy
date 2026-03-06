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
  if (doc.mimetype !== "application/pdf") return null;

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
  if (isDuplicate(buffer)) {
    console.log("the file sent before");
    return "DUPLICATE";
  }

  console.log(`Downloading PDF: ${doc.fileName || "unnamed"}...`);

  if (!fs.existsSync(config.downloadDir)) {
    fs.mkdirSync(config.downloadDir, { recursive: true });
  }

  const fileName = doc.fileName || `recived_${Date.now()}.pdf`;
  const filePath = path.join(config.downloadDir, fileName);

  fs.writeFileSync(filePath, buffer);
  console.log(`File saved successfullly: ${filePath}`);
  return filePath;
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
