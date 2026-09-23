import { NextResponse } from "next/server";
import { deleteBinder, getBinder, saveBinder } from "@/lib/binders";
import { getUserId } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId();
  const binder = await getBinder(params.id, userId);
  if (!binder) return NextResponse.json({ error: "Classeur introuvable" }, { status: 404 });
  return NextResponse.json(binder);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId();
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.cases)) {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const existing = await getBinder(params.id, userId);
  if (!existing) return NextResponse.json({ error: "Classeur introuvable" }, { status: 404 });

  await saveBinder(
    params.id,
    {
      format: Number(body.format) || 3,
      cases: body.cases,
    },
    userId
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId();
  const existing = await getBinder(params.id, userId);
  if (!existing) return NextResponse.json({ error: "Classeur introuvable" }, { status: 404 });
  await deleteBinder(params.id, userId);
  return NextResponse.json({ ok: true });
}
