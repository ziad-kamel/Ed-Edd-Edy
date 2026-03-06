import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  const config = require("@/lib/bot/config/config");
  const downloadDir = path.isAbsolute(config.downloadDir)
    ? config.downloadDir
    : path.resolve(process.cwd(), "..", config.downloadDir);

  const filePath = path.join(downloadDir, filename);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);

  return new Response(fileBuffer, {
    headers: {
      "Content-Type": "application/pdf", // Assuming most files are PDFs based on context
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
