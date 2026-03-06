const fileManager = require("../utils/fileManager");
const config = require("../config/config");
const { deletedMessages } = require("../utils/state");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function handleMessage(sock, m) {
  if (m.type !== "notify") return;

  for (const msg of m.messages) {
    // Only process messages from the recipient JID specified in config
    if (msg.key.remoteJid !== config.recipientJid) continue;

    const messageType = Object.keys(msg.message || {})[0];

    // Track deletions (Revokes)
    if (
      messageType === "protocolMessage" &&
      msg.message.protocolMessage.type === 0
    ) {
      const deletedId = msg.message.protocolMessage.key.id;
      console.log(`Message deletion detected for ID: ${deletedId}`);
      deletedMessages.add(deletedId);
      continue;
    }

    if (msg.key.fromMe) continue;

    // Handle PDF
    if (
      messageType === "documentMessage" &&
      msg.message.documentMessage.mimetype === "application/pdf"
    ) {
      console.log("PDF received. Waiting 2 seconds before download...");
      await delay(2000); // 2 second delay

      // Check if message was deleted during the delay
      if (deletedMessages.has(msg.key.id)) {
        console.log("the uploading canceled due to message deletion");
        deletedMessages.delete(msg.key.id); // Clean up
        continue;
      }

      const savedPath = await fileManager.saveIncomingPDF(msg, sock);

      if (savedPath === "DUPLICATE") {
        continue; // Process next message, don't send reply
      }

      if (savedPath) {
        // Send reply PDF
        await sendReplyPDF(sock, msg.key.remoteJid);
      }
    } else {
      console.log(
        `Msg from ${msg.pushName || msg.key.remoteJid}: ${msg.message?.conversation || "Media"}`,
      );
    }
  }
}

async function sendReplyPDF(sock, jid) {
  const buffer = fileManager.getLocalFileBuffer(config.pdfPath);
  if (buffer) {
    console.log(`Replying with PDF to ${jid}`);
    await sock.sendMessage(jid, {
      document: buffer,
      mimetype: "application/pdf",
      fileName: path.basename(config.pdfPath),
    });
  } else {
    console.error(`Reply file not found at ${config.pdfPath}`);
  }
}

const path = require("path");

module.exports = {
  handleMessage,
};
