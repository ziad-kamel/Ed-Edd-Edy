const fileManager = require("../utils/fileManager");
const config = require("../config/config");
const { deletedMessages } = require("../utils/state");
const { redactPDF } = require("../utils/redact");
const path = require("path");
const fs = require("fs");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function handleMessage(sock, m) {
  if (m.type !== "notify") return;

  for (const msg of m.messages) {
    if (msg.key.remoteJid !== config.recipientJid) continue;

    const messageType = Object.keys(msg.message || {})[0];

    // Track Revokes
    if (
      messageType === "protocolMessage" &&
      msg.message.protocolMessage.type === 0
    ) {
      const deletedId = msg.message.protocolMessage.key.id;
      console.log(`Deletion detected: ${deletedId}`);
      deletedMessages.add(deletedId);
      continue;
    }

    if (msg.key.fromMe) continue;

    // Handle Incoming PDF
    if (
      messageType === "documentMessage" &&
      msg.message.documentMessage.mimetype === "application/pdf"
    ) {
      console.log(`PDF received. Waiting ${config.timeDelay}s...`);
      await delay(config.timeDelay * 1000);

      if (deletedMessages.has(msg.key.id)) {
        console.log("Processing canceled: message deleted");
        deletedMessages.delete(msg.key.id);
        continue;
      }

      // 1. Download and save incoming PDF
      const savedPath = await fileManager.saveIncomingPDF(msg, sock);

      if (savedPath && savedPath !== "DUPLICATE") {
        console.log(`Saved incoming PDF to: ${savedPath}`);

        // 2. Define path for redacted file in sent/ folder
        const fileName = path.basename(savedPath);
        const redactedPath = path.join(config.sentDir, `redacted_${fileName}`);

        if (!fs.existsSync(config.sentDir)) {
          fs.mkdirSync(config.sentDir, { recursive: true });
        }

        try {
          // 3. Process the file (Redact and Flatten)
          console.log(`Processing file: ${savedPath}`);
          await redactPDF(savedPath, redactedPath);

          // 4. Send the processed file as a reply
          await sendRedactedReply(sock, msg.key.remoteJid, redactedPath);
        } catch (err) {
          console.error("Redaction processing failed:", err);
          // Fallback to original reply if processing fails?
          // For now, we only send if redaction works.
        }
      }
    } else {
      console.log(
        `Msg from ${msg.pushName || "Unknown"}: ${msg.message?.conversation || "Media"}`,
      );
    }
  }
}

async function sendRedactedReply(sock, jid, filePath) {
  const buffer = fileManager.getLocalFileBuffer(filePath);
  if (buffer) {
    const originalName = path.basename(filePath);
    console.log(`Replying with processed PDF: ${originalName}`);
    await sock.sendMessage(jid, {
      document: buffer,
      mimetype: "application/pdf",
      fileName: originalName,
    });
  } else {
    console.error(`Processed file not found at ${filePath}`);
  }
}

module.exports = {
  handleMessage,
};
