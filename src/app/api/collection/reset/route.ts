import { NextResponse } from "next/server";
import { resetCollection } from "@/lib/ownership";
import { getUserId } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export async function DELETE() {
  const userId = await getUserId();
  await resetCollection(userId);
  return NextResponse.json({ ok: true });
}
