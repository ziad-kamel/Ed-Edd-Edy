const QRCode = require("qrcode-terminal");
const makeWASocket = require("@whiskeysockets/baileys").default;
const {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const config = require("./src/config/config");
const { handleMessage } = require("./src/handlers/messageHandler");

async function startBot() {
  console.log("Starting WhatsApp Bot...");
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState(config.authDir);

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: config.browser,
    syncFullHistory: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update || {};

    if (qr) {
      console.log("\n--- SCAN QR CODE ---");
      QRCode.generate(qr, { small: true });
      console.log("--------------------\n");
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode !== DisconnectReason.loggedOut) {
        console.log("Connection closed, reconnecting...");
        startBot();
      } else {
        console.log("Logged out. Please delete auth folder and scan again.");
      }
    } else if (connection === "open") {
      console.log("Successfully connected to WhatsApp!");
    }
  });

  sock.ev.on("messages.upsert", (m) => handleMessage(sock, m));
}

startBot();
