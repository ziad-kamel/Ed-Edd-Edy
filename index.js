const QRCode = require("qrcode-terminal");
const makeWASocket = require("@whiskeysockets/baileys").default;
const {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const config = require("./src/config/config");
const { handleMessage } = require("./src/handlers/messageHandler");

const statusTracker = require("./src/utils/statusTracker");

async function startBot() {
  console.log("Starting WhatsApp Bot...");
  statusTracker.updateStatus({ status: "starting", qr: null });

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
      console.log("\n--- NEW QR CODE GENERATED ---");
      QRCode.generate(qr, { small: true });
      statusTracker.updateStatus({ status: "qr", qr });
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode !== DisconnectReason.loggedOut) {
        console.log("Connection closed, reconnecting...");
        statusTracker.updateStatus({ status: "reconnecting", qr: null });
        startBot();
      } else {
        console.log("Logged out. Please delete auth folder and scan again.");
        statusTracker.updateStatus({ status: "logged_out", qr: null });
      }
    } else if (connection === "open") {
      console.log("Successfully connected to WhatsApp!");
      statusTracker.updateStatus({ status: "connected", qr: null });
    }
  });

  sock.ev.on("messages.upsert", (m) => handleMessage(sock, m));
}

// Check if run directly or imported
if (require.main === module) {
  startBot();
}

module.exports = { startBot };
