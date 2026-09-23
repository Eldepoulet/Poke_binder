import { NextResponse } from "next/server";
import { createBinder, listBinders } from "@/lib/binders";
import { getUserId } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getUserId();
  const binders = await listBinders(userId);
  return NextResponse.json(binders);
}

export async function POST(request: Request) {
  const userId = await getUserId();
  const body = await request.json().catch(() => null);
  if (!body || (body.type !== "custom" && body.type !== "master")) {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  if (body.type === "custom") {
    const nom = typeof body.nom === "string" && body.nom.trim() ? body.nom.trim() : "Nouveau classeur";
    const id = await createBinder({ type: "custom", nom }, userId);
    return NextResponse.json({ id }, { status: 201 });
  }

  if (typeof body.set !== "string" || !body.set) {
    return NextResponse.json({ error: "Extension manquante" }, { status: 400 });
  }
  const variantes = body.variantes === "normale_reverse" ? "normale_reverse" : "normale";
  const id = await createBinder({ type: "master", set: body.set, variantes }, userId);
  return NextResponse.json({ id }, { status: 201 });
}
