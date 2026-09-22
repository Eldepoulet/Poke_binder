import { NextResponse } from "next/server";
import { resetCollection } from "@/lib/ownership";

export const dynamic = "force-dynamic";

export async function DELETE() {
  await resetCollection();
  return NextResponse.json({ ok: true });
}
