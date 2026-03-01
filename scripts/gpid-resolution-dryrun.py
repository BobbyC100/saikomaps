#!/usr/bin/env python3
"""
GPID Resolution with Text Search Fallback
Resolves google_place_id for places with null google_place_id:
  1. If lat/lng exist: Nearby Search (50m); if strong name match → attach.
  2. If no match from Nearby OR no coordinates: Text Search "${name} Los Angeles";
     if exactly one high-confidence result → attach.
Rules: Never overwrite existing google_place_id; log matches to console;
       dry-run by default (use --apply to persist). Only updates google_place_id.
"""

import argparse
import csv
import json
import math
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import psycopg2
import requests
from dotenv import load_dotenv
from rapidfuzz import fuzz as rfuzz

load_dotenv()
load_dotenv(".env.local")
load_dotenv(".env.db.neon")  # Neon connection string if used

DATABASE_URL = os.getenv("DATABASE_URL")
GOOGLE_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY")
NEARBY_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
RATE_LIMIT_SEC = 0.1
OUTPUT_CSV = Path(__file__).parent.parent / "data" / "logs" / "gpid_resolution_dryrun.csv"

# Strong name match threshold for Nearby (attach)
NEARBY_STRONG_MATCH_SCORE = 85
NEARBY_STRONG_MATCH_METERS = 50
# High-confidence for Text Search: exactly one result + name similarity
TEXT_SEARCH_HIGH_CONFIDENCE_SCORE = 85
# Top N candidates to store for human selection (AMBIGUOUS / MULTI_RESULTS)
TOP_N_CANDIDATES = 7


def extract_candidates(results: List[Dict], n: int = TOP_N_CANDIDATES) -> List[Dict[str, Any]]:
    """Extract top N candidates from API results for human selection."""
    out: List[Dict[str, Any]] = []
    for r in results[:n]:
        loc = r.get("geometry", {}).get("location", {})
        out.append({
            "google_place_id": r.get("place_id", ""),
            "name": r.get("name", ""),
            "formatted_address": r.get("formatted_address", ""),
            "lat": loc.get("lat"),
            "lng": loc.get("lng"),
            "types": r.get("types", []),
            "business_status": r.get("business_status", ""),
        })
    return out


def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Approximate distance in meters between two WGS84 points."""
    R = 6_371_000  # Earth radius meters
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(
        math.radians(lat2)
    ) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def normalize(s: str) -> str:
    return (s or "").lower().strip()


def clean_name(raw: str) -> str:
    """Strip comma-delimited metadata (e.g. 'Bestia,restaurant,1,Arts District...' -> 'Bestia')."""
    s = (raw or "").strip()
    if "," in s:
        return s.split(",")[0].strip()
    return s


def nearby_search(lat: float, lng: float, retry: bool = True) -> Tuple[List[Dict], Optional[str]]:
    """Call Nearby Search API (radius 50m). Returns (results, error). Retries once on timeout."""
    try:
        r = requests.get(
            NEARBY_URL,
            params={
                "location": f"{lat},{lng}",
                "radius": 50,
                "key": GOOGLE_API_KEY,
            },
            timeout=10,
        )
    except requests.RequestException as e:
        if retry and "timeout" in str(e).lower():
            time.sleep(1)
            return nearby_search(lat, lng, retry=False)
        return [], str(e)
    data = r.json()
    if data.get("status") != "OK" and data.get("status") != "ZERO_RESULTS":
        return [], data.get("status", "UNKNOWN")
    return data.get("results", []), None


def text_search(query: str, retry: bool = True) -> Tuple[List[Dict], Optional[str]]:
    """Call Text Search API. Returns (results, error). Retries once on timeout."""
    try:
        r = requests.get(
            TEXT_SEARCH_URL,
            params={"query": query, "key": GOOGLE_API_KEY},
            timeout=10,
        )
    except requests.RequestException as e:
        if retry and "timeout" in str(e).lower():
            time.sleep(1)
            return text_search(query, retry=False)
        return [], str(e)
    data = r.json()
    if data.get("status") != "OK" and data.get("status") != "ZERO_RESULTS":
        return [], data.get("status", "UNKNOWN")
    return data.get("results", []), None


def best_match(db_name: str, db_lat: float, db_lng: float, results: List[Dict]) -> Dict:
    """Pick best fuzzy match from API results."""
    if not results:
        return {
            "google_place_id": "NO_MATCH",
            "google_name": "",
            "match_score": 0,
            "distance_meters": 0,
            "confidence": "NO_MATCH",
            "notes": "No API results",
        }
    db_norm = normalize(clean_name(db_name))
    best = None
    best_score = 0
    best_dist = float("inf")
    best_result = None
    for r in results:
        gname = r.get("name", "")
        gnorm = normalize(gname)
        score = rfuzz.ratio(db_norm, gnorm)
        gloc = r.get("geometry", {}).get("location", {})
        glat = gloc.get("lat", 0)
        glng = gloc.get("lng", 0)
        dist = haversine_meters(db_lat, db_lng, glat, glng)
        if score > best_score or (score == best_score and dist < best_dist):
            best_score = score
            best_dist = dist
            best_result = r
    gpid = best_result.get("place_id", "NO_MATCH")
    gname = best_result.get("name", "")
    if best_score >= NEARBY_STRONG_MATCH_SCORE and best_dist <= NEARBY_STRONG_MATCH_METERS:
        conf = "HIGH"
    elif best_score >= 70 and best_dist <= 100:
        conf = "MEDIUM"
    else:
        conf = "LOW"
    notes = ""
    if len(results) > 1:
        notes = f"Multiple candidates ({len(results)} results)"
    return {
        "google_place_id": gpid,
        "google_name": gname,
        "match_score": best_score,
        "distance_meters": round(best_dist, 1),
        "confidence": conf,
        "notes": notes,
    }


def is_strong_nearby_match(m: Dict) -> bool:
    """True if Nearby result is strong enough to attach (HIGH and not NO_MATCH)."""
    return (
        m["confidence"] == "HIGH"
        and m["google_place_id"] not in ("NO_MATCH", "ERROR")
    )


def text_search_best(db_name: str, results: List[Dict]) -> Tuple[Optional[str], str, str, int]:
    """
    Returns (place_id_or_none, status, reason, n_text_results).
    status: MATCH | AMBIGUOUS | NO_MATCH
    reason: TEXT_SINGLE_HIGH_SIM | TEXT_MULTI_RESULTS | TEXT_ZERO_RESULTS | TEXT_LOW_SIM
    """
    n = len(results)
    if n >= 2:
        return (None, "AMBIGUOUS", "TEXT_MULTI_RESULTS", n)
    if n == 0:
        return (None, "NO_MATCH", "TEXT_ZERO_RESULTS", 0)
    r = results[0]
    gname = r.get("name", "")
    score = rfuzz.ratio(normalize(clean_name(db_name)), normalize(gname))
    if score < TEXT_SEARCH_HIGH_CONFIDENCE_SCORE:
        return (None, "NO_MATCH", "TEXT_LOW_SIM", 1)
    return (r.get("place_id"), "MATCH", "TEXT_SINGLE_HIGH_SIM", 1)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Resolve google_place_id via Nearby Search + Text Search fallback. Dry-run by default."
    )
    p.add_argument(
        "--apply",
        action="store_true",
        help="Persist google_place_id to DB (default: dry-run, no writes)",
    )
    p.add_argument(
        "--limit",
        type=int,
        default=0,
        metavar="N",
        help="Max places to process (0 = no limit)",
    )
    return p.parse_args()


def main() -> None:
    args = parse_args()
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL not set in .env or .env.local")
        sys.exit(1)
    if not GOOGLE_API_KEY:
        print("ERROR: GOOGLE_PLACES_API_KEY not set")
        sys.exit(1)

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    # All places with null google_place_id (with or without coords)
    cur.execute(
        """
        SELECT id, name, latitude, longitude, google_place_id
        FROM places
        WHERE google_place_id IS NULL OR btrim(COALESCE(google_place_id, '')) = ''
        ORDER BY id
        """
    )
    rows = cur.fetchall()
    if args.limit > 0:
        rows = rows[: args.limit]
    total = len(rows)
    cur.close()

    mode = "APPLY (persisting)" if args.apply else "DRY RUN (no writes)"
    print(f"GPID Resolution — {mode}\n")
    print(f"Places with null google_place_id: {total}\n")

    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    counts = {"HIGH": 0, "MEDIUM": 0, "LOW": 0, "NO_MATCH": 0, "ERROR": 0}
    matched_nearby = 0
    matched_text = 0

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "db_id",
                "db_name",
                "clean_name",
                "db_lat",
                "db_lng",
                "db_google_place_id",
                "resolved_google_place_id",
                "google_name",
                "match_score",
                "distance_meters",
                "confidence",
                "source",
                "num_candidates",
                "notes",
                "status",
                "reason",
                "n_text_results",
                "n_nearby_results",
                "candidates_json",
            ]
        )

        for i, (db_id, db_name, db_lat, db_lng, db_gpid) in enumerate(rows, 1):
            db_lat_f = float(db_lat) if db_lat is not None else None
            db_lng_f = float(db_lng) if db_lng is not None else None
            has_coords = (
                db_lat_f is not None
                and db_lng_f is not None
                and abs(db_lat_f) <= 90
                and abs(db_lng_f) <= 180
            )

            resolved_gpid: Optional[str] = None
            source = ""
            row_confidence = "NO_MATCH"
            row_google_name = ""
            row_score = 0
            row_dist = 0
            row_notes = ""
            num_candidates = 0
            status = ""
            reason = ""
            n_nearby_results = 0
            n_text_results = 0
            text_results: List[Dict] = []

            # 1) If lat/lng exist: try Nearby (50m)
            if has_coords:
                results, err = nearby_search(db_lat_f, db_lng_f)
                time.sleep(RATE_LIMIT_SEC)
                if err:
                    row_confidence = "ERROR"
                    row_notes = err
                    status = "ERROR"
                    reason = "NEARBY_API_ERROR"
                    n_nearby_results = 0
                    n_text_results = 0
                    counts["ERROR"] += 1
                    writer.writerow(
                        [
                            db_id,
                            db_name,
                            clean_name(db_name),
                            db_lat_f,
                            db_lng_f,
                            (db_gpid or "").strip() if db_gpid is not None else "",
                            "",
                            0,
                            0,
                            "ERROR",
                            "",
                            0,
                            err,
                            status,
                            reason,
                            n_text_results,
                            n_nearby_results,
                            json.dumps([]),
                        ]
                    )
                    print(f"  ERROR [{db_id}] {db_name}: API {err}")
                    continue
                m = best_match(db_name, db_lat_f, db_lng_f, results)
                num_candidates = len(results)
                n_nearby_results = len(results)
                row_confidence = m["confidence"]
                row_google_name = m["google_name"]
                row_score = m["match_score"]
                row_dist = m["distance_meters"]
                row_notes = m["notes"]
                if is_strong_nearby_match(m):
                    resolved_gpid = m["google_place_id"]
                    source = "nearby"
                    status = "MATCH"
                    reason = "NEARBY_STRONG_MATCH"
                    matched_nearby += 1
                    print(f"  MATCH [nearby]  {db_name} → {resolved_gpid}")

            # 2) If no match from Nearby OR no coordinates: Text Search fallback
            if resolved_gpid is None:
                text_query = f"{clean_name(db_name)} Los Angeles"
                text_results, err = text_search(text_query)
                time.sleep(RATE_LIMIT_SEC)
                if err:
                    row_confidence = "ERROR"
                    row_notes = f"text_search: {err}"
                    source = "text_search"
                    status = "ERROR"
                    reason = "TEXT_API_ERROR"
                    n_text_results = 0
                    counts["ERROR"] += 1
                    writer.writerow(
                        [
                            db_id,
                            db_name,
                            clean_name(db_name),
                            db_lat_f,
                            db_lng_f,
                            (db_gpid or "").strip() if db_gpid is not None else "",
                            "",
                            0,
                            0,
                            "ERROR",
                            "text_search",
                            0,
                            err,
                            status,
                            reason,
                            n_text_results,
                            n_nearby_results,
                            json.dumps([]),
                        ]
                    )
                    print(f"  ERROR [{db_id}] {db_name}: Text Search {err}")
                    continue
                place_id_opt, status, reason, n_text_results = text_search_best(
                    db_name, text_results
                )
                if place_id_opt is not None:
                    resolved_gpid = place_id_opt
                    source = "text_search"
                    matched_text += 1
                    row_google_name = text_results[0].get("name", "") if text_results else ""
                    row_score = rfuzz.ratio(
                        normalize(clean_name(db_name)), normalize(row_google_name)
                    )
                    row_confidence = "HIGH"
                    num_candidates = 1
                    row_notes = "Exactly one high-confidence result"
                    print(f"  MATCH [text]    {db_name} → {resolved_gpid}")
                elif not has_coords:
                    row_confidence = "NO_MATCH"
                    row_notes = "No coords; text search had 0 or >1 or low confidence"
                    num_candidates = len(text_results)

            counts[row_confidence] = counts.get(row_confidence, 0) + 1

            # Invariant: status != "MATCH" => resolved_gpid must be None (never write on AMBIGUOUS/NO_MATCH/ERROR)
            if status != "MATCH":
                resolved_gpid = None

            # Persist only when status is MATCH and we have a resolved GPID (double gate)
            if args.apply and status == "MATCH" and resolved_gpid:
                try:
                    cur = conn.cursor()
                    cur.execute(
                        "UPDATE places SET google_place_id = %s WHERE id = %s",
                        (resolved_gpid, db_id),
                    )
                    conn.commit()
                    cur.close()
                except Exception as e:
                    print(f"  WRITE ERROR [{db_id}]: {e}")
                    conn.rollback()

            resolved_for_csv = resolved_gpid if status == "MATCH" else ""
            db_gpid_for_csv = (db_gpid or "").strip() if db_gpid is not None else ""
            # Store top N text-search results as candidates for human selection
            candidates = extract_candidates(text_results) if text_results else []
            num_candidates = len(candidates)
            writer.writerow(
                [
                    db_id,
                    db_name,
                    clean_name(db_name),
                    db_lat_f,
                    db_lng_f,
                    db_gpid_for_csv,
                    resolved_for_csv,
                    row_google_name,
                    row_score,
                    row_dist,
                    row_confidence,
                    source,
                    num_candidates,
                    row_notes,
                    status,
                    reason,
                    n_text_results,
                    n_nearby_results,
                    json.dumps(candidates),
                ]
            )

    conn.close()

    print("\n--- Summary ---")
    print(f"  Matched (Nearby):   {matched_nearby}")
    print(f"  Matched (Text):     {matched_text}")
    print(f"  High confidence:    {counts.get('HIGH', 0)}")
    print(f"  Medium confidence:  {counts.get('MEDIUM', 0)}")
    print(f"  Low confidence:     {counts.get('LOW', 0)}")
    print(f"  No match:           {counts.get('NO_MATCH', 0)}")
    print(f"  Errors:             {counts.get('ERROR', 0)}")
    print(f"  Total processed:    {total}")
    print(f"  Output CSV:         {OUTPUT_CSV}")
    if not args.apply:
        print("  (Dry run — use --apply to persist)")


if __name__ == "__main__":
    main()
