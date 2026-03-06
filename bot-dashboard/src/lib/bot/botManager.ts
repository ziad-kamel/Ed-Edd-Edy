import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  WASocket,
} from "@whiskeysockets/baileys";
import path from "path";
import config from "./config/config";
import { handleMessage } from "./handlers/messageHandler";

// Global state to store the bot status and instance
interface BotState {
  status: string;
  qr: string | null;
  sock: WASocket | null;
  isRunning: boolean;
  logs: string[];
}

let botState: BotState = {
  status: "disconnected",
  qr: null,
  sock: null,
  isRunning: false,
  logs: [],
};

// Singleton storage
if (!(global as any).botState) {
  (global as any).botState = botState;
} else {
  botState = (global as any).botState;
}

const MAX_LOGS = 100;

export function addBotLog(msg: string) {
  const timestamp = new Date().toLocaleTimeString();
  const log = `[${timestamp}] ${msg}`;
  botState.logs.push(log);
  if (botState.logs.length > MAX_LOGS) {
    botState.logs.shift();
  }
  console.log(`[Bot Log] ${log}`);
}

// Make logger available to JS files via global
(global as any).addBotLog = addBotLog;

export const getBotState = () => botState;

export async function stopBot() {
  if (botState.sock) {
    try {
      // botState.sock.logout(); // Sometimes causes hangs on hot reload
      botState.sock.end(undefined);
    } catch (e) {}
  }
  botState.status = "disconnected";
  botState.qr = null;
  botState.sock = null;
  botState.isRunning = false;
  addBotLog("Bot stopped.");
}

export async function startBot() {
  if (
    botState.isRunning &&
    (botState.status === "connected" || botState.status === "starting")
  )
    return;

  botState.isRunning = true;
  botState.status = "starting";
  addBotLog("Starting WhatsApp Bot...");

  try {
    const { version } = await fetchLatestBaileysVersion();

    const authPath = path.resolve(process.cwd(), "..", config.authDir);
    const { state, saveCreds } = await useMultiFileAuthState(authPath);

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: config.browser as [string, string, string],
      syncFullHistory: false,
    });

    botState.sock = sock;

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update || {};

      if (qr) {
        addBotLog("New QR code generated.");
        botState.status = "qr";
        botState.qr = qr;
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        if (statusCode !== DisconnectReason.loggedOut) {
          addBotLog("Connection closed, reconnecting...");
          botState.status = "reconnecting";
          botState.qr = null;
          botState.isRunning = false;
          setTimeout(startBot, 5000); // Retry after 5s
        } else {
          addBotLog("Logged out. Please scan again.");
          botState.status = "logged_out";
          botState.qr = null;
          botState.isRunning = false;
        }
      } else if (connection === "open") {
        addBotLog("Successfully connected to WhatsApp!");
        botState.status = "connected";
        botState.qr = null;
      }
    });

    sock.ev.on("messages.upsert", (m) => {
      if (m.type === "notify") {
        handleMessage(sock, m);
      }
    });
  } catch (error: any) {
    addBotLog(`Error: ${error.message}`);
    botState.isRunning = false;
    botState.status = "error";
  }
}
