/**
 * Server-side Airtable helpers. The API key grants access to the whole base,
 * so it is only ever read here — never shipped to the client.
 */

const AIRTABLE = "https://api.airtable.com/v0";
const BASE_ID = process.env.AIRTABLE_BASE_ID ?? "appbp1KPeKtqlkat8";
const SPEAKERS_TABLE = process.env.AIRTABLE_SPEAKERS_TABLE ?? "tblFSDPfzeyqMaFxr";

export interface Speaker {
  id: string;
  name: string;
  /** role + org, e.g. "Head of Policy, Palisade Research" */
  subtitle: string;
  photoUrl: string;
  featured: boolean;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

async function airtable(path: string): Promise<Record<string, unknown>> {
  const key = process.env.AIRTABLE_API_KEY;
  if (!key) throw new Error("AIRTABLE_API_KEY not set");
  const res = await fetch(`${AIRTABLE}${path}`, {
    headers: { Authorization: `Bearer ${key}`, accept: "application/json" },
    /* Attachment URLs are signed and expire, so this can't be cached
       indefinitely — 5 minutes keeps them fresh well inside their lifetime. */
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Airtable ${path} → ${res.status}`);
  return res.json();
}

/** Prefer the 512px thumbnail; fall back to the original attachment. */
function photoUrl(photo: any): string {
  if (!Array.isArray(photo) || !photo.length) return "";
  const a = photo[0];
  return a?.thumbnails?.large?.url ?? a?.url ?? "";
}

export async function getSpeakers(): Promise<Speaker[]> {
  try {
    const data: any = await airtable(`/${BASE_ID}/${SPEAKERS_TABLE}?maxRecords=100`);
    return (data.records ?? [])
      .map((r: any) => {
        const f = r.fields ?? {};
        return {
          id: r.id,
          name: f.Name ?? "",
          subtitle: f.Title ?? "",
          photoUrl: photoUrl(f.Photo),
          featured: !!f.Featured,
        };
      })
      /* only Featured rows go on the site; that also skips the blank rows
         Airtable keeps around for new entries */
      .filter((s: Speaker) => s.featured && s.name && s.photoUrl);
  } catch (err) {
    console.error("[airtable:speakers]", err);
    return [];
  }
}
