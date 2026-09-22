/**
 * Import ponctuel : copie les 202 extensions du dossier source
 * (Desktop/PokeBinder) dans le projet, et construit prisma/sets-meta.json
 * (noms/séries) depuis l'API TCGdex. Ne touche pas à la base — seulement
 * des fichiers. Relançable sans risque (copie idempotente).
 *
 * Usage: npx tsx prisma/scripts/import-catalogue.ts
 */
import fs from "node:fs";
import path from "node:path";

const SOURCE = "C:\\Users\\elvin\\Desktop\\PokeBinder";
const SOURCE_DATA = path.join(SOURCE, "data");
const SOURCE_IMAGES = path.join(SOURCE, "images");

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const DEST_DATA = path.join(PROJECT_ROOT, "prisma", "data");
const DEST_IMAGES = path.join(PROJECT_ROOT, "public", "cards");
const SETS_META_PATH = path.join(PROJECT_ROOT, "prisma", "sets-meta.json");

const API = "https://api.tcgdex.net/v2/fr";

type ApiSetSummary = {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  cardCount?: { total?: number; official?: number };
};

type ApiSerieSummary = { id: string; name: string; logo?: string };

type SetMeta = {
  code: string;
  name: string;
  serieCode: string | null;
  serieName: string | null;
  logo: string | null;
  symbol: string | null;
  cardCount: number | null;
};

function copyDataFiles(): string[] {
  const files = fs.readdirSync(SOURCE_DATA).filter((f) => f.endsWith("_fr.json"));
  fs.mkdirSync(DEST_DATA, { recursive: true });
  const codes: string[] = [];
  for (const file of files) {
    const code = file.replace(/_fr\.json$/, "");
    codes.push(code);
    fs.copyFileSync(path.join(SOURCE_DATA, file), path.join(DEST_DATA, `${code}.json`));
  }
  console.log(`Données : ${codes.length} extensions copiées vers ${DEST_DATA}`);
  return codes;
}

function copyImages(codes: string[]) {
  let copied = 0;
  let skipped = 0;
  let noImages = 0;
  for (const code of codes) {
    const srcDir = path.join(SOURCE_IMAGES, code);
    if (!fs.existsSync(srcDir)) {
      noImages++;
      continue;
    }
    const files = fs.readdirSync(srcDir).filter((f) => f.endsWith(".webp"));
    if (!files.length) {
      noImages++;
      continue;
    }
    const destDir = path.join(DEST_IMAGES, code);
    fs.mkdirSync(destDir, { recursive: true });
    for (const file of files) {
      const src = path.join(srcDir, file);
      const dest = path.join(destDir, file);
      const srcSize = fs.statSync(src).size;
      if (fs.existsSync(dest) && fs.statSync(dest).size === srcSize) {
        skipped++;
        continue;
      }
      fs.copyFileSync(src, dest);
      copied++;
    }
  }
  console.log(
    `Images : ${copied} copiées, ${skipped} déjà présentes, ${noImages} extension(s) sans visuel source.`
  );
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function buildSetsMeta(codes: string[]): Promise<void> {
  const flatSets = await fetchJson<ApiSetSummary[]>(`${API}/sets`);
  const serieList = await fetchJson<ApiSerieSummary[]>(`${API}/series`);

  if (!flatSets) {
    console.warn(
      "Impossible de joindre l'API TCGdex (métadonnées) — repli sur les codes bruts, sans série."
    );
    const meta: SetMeta[] = codes.map((code) => ({
      code,
      name: code,
      serieCode: null,
      serieName: null,
      logo: null,
      symbol: null,
      cardCount: null,
    }));
    fs.writeFileSync(SETS_META_PATH, JSON.stringify(meta, null, 2));
    console.log(`sets-meta.json écrit (${meta.length} entrées, sans regroupement par série).`);
    return;
  }

  const byCode = new Map(flatSets.map((s) => [s.id, s]));

  // code -> {serieCode, serieName} en interrogeant chaque série une par une
  // (best-effort : une série qui échoue ne bloque pas les autres).
  const serieOfCode = new Map<string, { serieCode: string; serieName: string }>();
  if (serieList) {
    for (const serie of serieList) {
      const detail = await fetchJson<{ id: string; name: string; sets?: { id: string }[] }>(
        `${API}/series/${encodeURIComponent(serie.id)}`
      );
      if (!detail?.sets) continue;
      for (const s of detail.sets) {
        serieOfCode.set(s.id, { serieCode: serie.id, serieName: serie.name });
      }
    }
  }

  const meta: SetMeta[] = codes.map((code) => {
    const api = byCode.get(code);
    const serie = serieOfCode.get(code);
    return {
      code,
      name: api?.name ?? code,
      serieCode: serie?.serieCode ?? null,
      serieName: serie?.serieName ?? null,
      logo: api?.logo ?? null,
      symbol: api?.symbol ?? null,
      cardCount: api?.cardCount?.official ?? api?.cardCount?.total ?? null,
    };
  });

  fs.writeFileSync(SETS_META_PATH, JSON.stringify(meta, null, 2));
  const withSerie = meta.filter((m) => m.serieCode).length;
  console.log(`sets-meta.json écrit (${meta.length} entrées, ${withSerie} rattachées à une série).`);
}

async function main() {
  if (!fs.existsSync(SOURCE_DATA)) {
    console.error(`Dossier source introuvable : ${SOURCE_DATA}`);
    process.exit(1);
  }
  const codes = copyDataFiles();
  copyImages(codes);
  await buildSetsMeta(codes);
  console.log("Import terminé.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
