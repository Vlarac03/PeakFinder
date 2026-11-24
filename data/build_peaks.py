"""Genera data/peaks.json: cims importants del Pirineu i Catalunya, des d'OpenStreetMap.

Us: python data/build_peaks.py [alcada_minima_m] [radi_km]   (per defecte 1000 m i 8 km)
Nomes es queda el cim mes alt de cada radi (a falta de prominencia a OSM).
Sortida: [[lat, lon, alcada_m, nom], ...] ordenat per alcada descendent.
"""
import json
import math
import sys
import urllib.parse
import urllib.request
from pathlib import Path

# Pirineu sencer (Pais Basc - Cap de Creus) i Catalunya: sud, oest, nord, est.
BBOX = (40.5, -2.0, 43.5, 3.4)
OVERPASS = "https://overpass-api.de/api/interpreter"
HERE = Path(__file__).parent
# Cims que sempre s'han de quedar encara que n'hi hagi un de mes alt a prop (nom exacte a OSM).
KEEP = {"Pollegó Superior", "Matagalls"}  # Pedraforca i Matagalls
JS_OUT = HERE.parent / "entry/src/main/js/MainAbility/common/peaks.js"
CACHE = HERE / "raw" / "peaks_osm.json"


def download():
    s, w, n, e = BBOX
    query = f'[out:json][timeout:90];node["natural"="peak"]["name"]["ele"]({s},{w},{n},{e});out;'
    req = urllib.request.Request(
        OVERPASS,
        data=urllib.parse.urlencode({"data": query}).encode(),
        headers={"User-Agent": "peakfinder-data-script"},
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)


def parse_ele(text):
    try:
        return round(float(text.replace(",", ".").split()[0].rstrip("m")))
    except (ValueError, IndexError):
        return None  # ele mal escrit a OSM (p. ex. "alt"): es descarta


def dist_km(a, b):
    dy = (a[0] - b[0]) * 111.2
    dx = (a[1] - b[1]) * 111.2 * math.cos(math.radians((a[0] + b[0]) / 2))
    return math.hypot(dx, dy)


def main():
    min_ele = int(sys.argv[1]) if len(sys.argv) > 1 else 1000
    radius = float(sys.argv[2]) if len(sys.argv) > 2 else 8.0
    CACHE.parent.mkdir(exist_ok=True)
    if CACHE.exists():
        data = json.loads(CACHE.read_text(encoding="utf-8"))
    else:
        data = download()
        CACHE.write_text(json.dumps(data), encoding="utf-8")

    cands = []
    for el in data["elements"]:
        t = el["tags"]
        ele = parse_ele(t["ele"])
        if ele is not None and ele >= min_ele:
            cands.append([round(el["lat"], 4), round(el["lon"], 4), ele, t["name"]])
    cands.sort(key=lambda p: -p[2])

    out = []
    for p in cands:  # de mes alt a mes baix: descarta els que tenen un cim mes alt a < radius km
        if p[3] in KEEP or all(dist_km(p, q) >= radius for q in out):
            out.append(p)
    path = HERE / "peaks.json"
    path.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    JS_OUT.parent.mkdir(parents=True, exist_ok=True)
    # Una cadena "lat,lon,cota,nom" per linia: al rellotge ocupa molta menys memoria que un array d'arrays.
    header = "// Generat per data/build_peaks.py (c) OpenStreetMap, ODbL. lat,lon,cota,nom per linia\nexport default "
    body = "\n".join(f"{q[0]},{q[1]},{q[2]},{q[3]}" for q in out)
    JS_OUT.write_text(header + json.dumps(body, ensure_ascii=False) + ";\n", encoding="utf-8")
    print(f"{len(out)} cims >= {min_ele} m (radi {radius} km) -> {path} ({path.stat().st_size} bytes)")
    for p in out[:15]:
        print(f"  {p[2]} m  {p[3]}  ({p[0]}, {p[1]})")


if __name__ == "__main__":
    main()
