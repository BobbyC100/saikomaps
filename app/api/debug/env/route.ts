import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME ?? null,
    R2_ENDPOINT: process.env.R2_ENDPOINT ?? null,
    hasAccessKey: Boolean(process.env.R2_ACCESS_KEY_ID),
    hasSecretKey: Boolean(process.env.R2_SECRET_ACCESS_KEY),
  });
}
