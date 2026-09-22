/**
 * Régénère public/osm-brands-tarn.json (fallback enseignes si Overpass est down).
 * Usage: node scripts/fetch-osm-brands.mjs
 */
const q = `
  [out:json][timeout:60];
  (
    nwr["amenity"="fuel"]["ref:FR:prix-carburants"](43.35,1.5,44.3,2.85);
  );
  out center tags;
`

const urls = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
]

for (const url of urls) {
  const t0 = Date.now()
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": "CarbuTarn/1.0 (local-dev)",
      },
      body: `data=${encodeURIComponent(q)}`,
      signal: AbortSignal.timeout(60_000),
    })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const d = await r.json()
    const map = {}
    for (const e of d.elements) {
      const ref = e.tags?.["ref:FR:prix-carburants"]
      if (!ref) continue
      map[ref] = {
        brand: e.tags.brand || e.tags.name || e.tags.operator || null,
        name: e.tags.name || null,
        lat: e.lat ?? e.center?.lat ?? null,
        lon: e.lon ?? e.center?.lon ?? null,
      }
    }
    const { writeFile } = await import("node:fs/promises")
    await writeFile("public/osm-brands-tarn.json", JSON.stringify(map), "utf8")
    console.log(
      `OK ${url} (${Date.now() - t0}ms) → ${Object.keys(map).length} stations`,
    )
    break
  } catch (e) {
    console.log(`FAIL ${url} (${Date.now() - t0}ms)`, e.message)
  }
}
