import { NextResponse } from "next/server";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";

// Store process globally in Next.js dev to allow persistence across hot reloads
let botProcess: ChildProcess | null = (global as any).botProcess || null;

export async function POST(request: Request) {
  const { action } = await request.json();
  const rootDir = path.resolve(process.cwd(), "..");
  const indexPath = path.join(rootDir, "index.js");
  const statusFilePath = path.join(rootDir, "bot-status.json");

  if (action === "start") {
    if (botProcess && !botProcess.killed) {
      return NextResponse.json(
        { message: "Bot process is already active" },
        { status: 400 },
      );
    }

    // Reset status file
    fs.writeFileSync(
      statusFilePath,
      JSON.stringify({
        status: "starting",
        qr: null,
        lastUpdate: new Date().toISOString(),
      }),
    );

    console.log("Spawning bot process:", indexPath);

    botProcess = spawn("node", [indexPath], {
      cwd: rootDir,
      stdio: "inherit",
      detached: false,
    });

    (global as any).botProcess = botProcess;

    botProcess.on("exit", (code) => {
      console.log(`Bot process exited with code ${code}`);
      (global as any).botProcess = null;
      botProcess = null;

      try {
        if (fs.existsSync(statusFilePath)) {
          const current = JSON.parse(
            fs.readFileSync(statusFilePath, "utf8") || "{}",
          );
          fs.writeFileSync(
            statusFilePath,
            JSON.stringify({
              ...current,
              status: "disconnected",
              qr: null,
            }),
          );
        }
      } catch (err) {}
    });

    return NextResponse.json({ message: "Bot starting (external process)" });
  }

  if (action === "stop") {
    if (!botProcess || botProcess.killed) {
      return NextResponse.json(
        { message: "Bot is not running" },
        { status: 400 },
      );
    }

    botProcess.kill("SIGINT");
    (global as any).botProcess = null;
    botProcess = null;

    return NextResponse.json({ message: "Bot stopped" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function GET() {
  const rootDir = path.resolve(process.cwd(), "..");
  const statusFilePath = path.join(rootDir, "bot-status.json");
  let statusData = { status: "disconnected", qr: null, lastUpdate: "" };

  if (fs.existsSync(statusFilePath)) {
    try {
      statusData = JSON.parse(fs.readFileSync(statusFilePath, "utf8"));
    } catch (e) {}
  }

  const isRunning = !!botProcess && !botProcess.killed;

  return NextResponse.json({
    ...statusData,
    isRunning,
    logs: ["External process mode active. Check terminal for raw logs."],
  });
}
