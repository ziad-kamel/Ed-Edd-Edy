import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Helper to get the absolute path of the received directory
const getDownloadDir = () => {
  // These paths should match what the bot is using now
  const config = require("@/lib/bot/config/config");
  return path.isAbsolute(config.downloadDir)
    ? config.downloadDir
    : path.resolve(process.cwd(), "..", config.downloadDir);
};

export async function GET() {
  try {
    const downloadDir = getDownloadDir();

    if (!fs.existsSync(downloadDir)) {
      return NextResponse.json({ files: [] });
    }

    const files = fs
      .readdirSync(downloadDir)
      .filter((file) => fs.lstatSync(path.join(downloadDir, file)).isFile())
      .map((file) => {
        const stats = fs.statSync(path.join(downloadDir, file));
        return {
          name: file,
          size: stats.size,
          mtime: stats.mtime,
          type: path.extname(file).toLowerCase().replace(".", "") || "file",
        };
      })
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime()); // Newest first

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Error listing files:", error);
    return NextResponse.json(
      { error: "Failed to list files" },
      { status: 500 },
    );
  }
}
