import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

const DATA_FILE = path.resolve(process.cwd(), "..", "data", "network.json");

export async function GET() {
  if (!fs.existsSync(DATA_FILE)) {
    return NextResponse.json(
      { error: "network.json not found. Run npm run build:network first." },
      { status: 404 }
    );
  }

  const contents = fs.readFileSync(DATA_FILE, "utf-8");
  return new Response(contents, {
    headers: { "Content-Type": "application/json" },
  });
}
