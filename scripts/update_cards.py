"""Refresh English + Japanese TCG sets, cards and prices from TCGdex into data/.

Run:  python3 scripts/update_cards.py
"""
import json, os, re, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

API = "https://api.tcgdex.net/v2"
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
VARIANTS = {"holofoil": "Holo", "normal": "Normal", "reverse-holofoil": "Reverse Holo",
            "1st-edition-holofoil": "1st Ed. Holo", "1st-edition": "1st Ed.",
            "unlimited-holofoil": "Unlimited Holo", "unlimited": "Unlimited"}
JP_ERAS = {"PMCG": "Original (Japan)", "neo": "Neo (Japan)", "VS": "VS", "web": "Web", "e": "e-Card (Japan)",
           "ADV": "ADV", "PCG": "PCG", "L": "LEGEND", "XY": "XY", "XYb": "XY BREAK", "SM": "Sun & Moon",
           "S": "Sword & Shield", "M": "Mega Evolution", "SV": "Scarlet & Violet"}


def get(url, tries=4):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "PokeVault/1.0"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except Exception:
            if i == tries - 1:
                return None
            time.sleep(1.5 * (i + 1))


def rnd(v):
    return round(v, 2) if isinstance(v, (int, float)) and v else None


def card_row(c, eur_usd):
    pr = c.get("pricing") or {}
    tp = pr.get("tcgplayer") or {}
    cm = pr.get("cardmarket") or {}
    var = []
    for key, v in tp.items():
        if isinstance(v, dict) and (v.get("marketPrice") or v.get("midPrice")):
            label = VARIANTS.get(key, key.replace("-", " ").title())
            var.append([label, rnd(v.get("marketPrice")), rnd(v.get("lowPrice")), rnd(v.get("midPrice")), rnd(v.get("highPrice"))])
    var.sort(key=lambda v: list(VARIANTS.values()).index(v[0]) if v[0] in VARIANTS.values() else 99)
    cmv = [rnd(cm.get("trend")), rnd(cm.get("avg7")), rnd(cm.get("avg30")), rnd(cm.get("low"))] if cm else None
    # Headline market price in USD: TCGplayer market (highest variant), else Cardmarket trend converted.
    tp_best = max([v[1] or v[3] or 0 for v in var] or [0])
    cm_usd = (cmv[0] or cmv[2] or 0) * eur_usd if cmv else 0
    price = rnd(tp_best) or rnd(cm_usd)
    src = "tcgplayer" if tp_best else ("cardmarket" if cm_usd else None)
    mom = None  # 7-day vs 30-day average, Cardmarket sales
    if cmv and cmv[1] and cmv[2]:
        mom = round((cmv[1] - cmv[2]) / cmv[2] * 100, 1)
    row = {"id": c["id"], "n": c.get("localId"), "name": c.get("name"), "r": c.get("rarity"),
           "cat": c.get("category"), "art": c.get("illustrator"), "img": c.get("image"),
           "p": price, "src": src, "mom": mom, "tp": var, "cm": cmv}
    if c.get("dexId"):
        row["dex"] = c["dexId"][0]
    return {k: v for k, v in row.items() if v not in (None, [], "")}


def save_history(lang, set_id, rows, day=None):
    """Append today's market price for each card to data/history/<lang>/<set>.json."""
    day = day or time.strftime("%Y-%m-%d")
    os.makedirs(os.path.join(ROOT, "history", lang), exist_ok=True)
    path = os.path.join(ROOT, "history", lang, set_id + ".json")
    hist = json.load(open(path)) if os.path.exists(path) else {}
    for r in rows:
        if r.get("p") is None:
            continue
        pts = hist.setdefault(r["id"], [])
        if pts and pts[-1][0] == day:
            pts[-1][1] = r["p"]
        else:
            pts.append([day, r["p"]])
    json.dump(hist, open(path, "w"), separators=(",", ":"))


def build(lang, eur_usd, out_sets):
    sets = get(f"{API}/{lang}/sets") or sys.exit(f"could not load {lang} set list")
    with ThreadPoolExecutor(16) as ex:
        details = [d for d in ex.map(lambda s: get(f"{API}/{lang}/sets/{s['id']}"), sets) if d]
    details = [d for d in details if (d.get("serie") or {}).get("id") != "tcgp"]  # skip the digital TCG Pocket game
    os.makedirs(os.path.join(ROOT, "cards", lang), exist_ok=True)
    # Fetch every card of every set through one shared pool (much faster than set by set).
    skip = os.environ.get("SKIP_EXISTING") == "1"
    todo = [(d["id"], c["id"]) for d in details for c in (d.get("cards") or [])
            if not (skip and os.path.exists(os.path.join(ROOT, "cards", lang, d["id"] + ".json")))]
    fetched = {}
    with ThreadPoolExecutor(64) as ex:
        for i, (key, res) in enumerate(zip(todo, ex.map(lambda t: get(f"{API}/{lang}/cards/{t[1]}"), todo))):
            if res:
                fetched.setdefault(key[0], []).append(card_row(res, eur_usd))
            if i % 1000 == 0:
                print(f"{lang} {i}/{len(todo)} cards", flush=True)
    for d in details:
        path = os.path.join(ROOT, "cards", lang, d["id"] + ".json")
        if d["id"] in fetched:
            rows = fetched[d["id"]]
        elif skip and os.path.exists(path):
            rows = json.load(open(path))["cards"]
        else:
            continue
        rows.sort(key=lambda r: (int(re.sub(r"\D", "", r.get("n") or "") or 0), r.get("n") or ""))
        # TCGdex often omits the picture link even when the image exists; fill it in from the set's image folder.
        base = f"https://assets.tcgdex.net/{lang}/{(d.get('serie') or {}).get('id')}/{d['id']}"
        for r in rows:
            if not r.get("img") and r.get("n"):
                r["img"], r["ig"] = f"{base}/{r['n']}", 1
        json.dump({"id": d["id"], "lang": lang, "cards": rows},
                  open(os.path.join(ROOT, "cards", lang, d["id"] + ".json"), "w"), separators=(",", ":"), ensure_ascii=False)
        save_history(lang, d["id"], rows)
        prices = [r.get("p") or 0 for r in rows]
        serie = d.get("serie") or {}
        cc = d.get("cardCount") or {}
        out_sets.append({k: v for k, v in {
            "id": d["id"], "lang": lang, "name": d["name"],
            "era": JP_ERAS.get(serie.get("id"), serie.get("name")) if lang == "ja" else serie.get("name"),
            "date": d.get("releaseDate"), "total": cc.get("total"), "official": cc.get("official"),
            "logo": d.get("logo"), "symbol": d.get("symbol"), "code": (d.get("abbreviation") or {}).get("official"),
            "count": len(rows), "value": round(sum(prices), 2), "top": round(max(prices or [0]), 2),
        }.items() if v not in (None, "")})
        print(f"{lang} {d['id']:>12}  {len(rows):>4} cards", flush=True)


def main():
    fx = get("https://api.frankfurter.dev/v1/latest?from=EUR&to=USD") or {}
    eur_usd = (fx.get("rates") or {}).get("USD", 1.1)
    out_sets = []
    for lang in ("en", "ja"):
        build(lang, eur_usd, out_sets)
    out_sets.sort(key=lambda s: (s.get("date") or "", s["id"]))
    json.dump({"updated": time.strftime("%Y-%m-%d"), "eurUsd": eur_usd, "sets": out_sets},
              open(os.path.join(ROOT, "sets.json"), "w"), separators=(",", ":"), ensure_ascii=False)
    print("done", len(out_sets), "sets")


if __name__ == "__main__":
    main()
