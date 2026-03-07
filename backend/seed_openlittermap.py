#!/usr/bin/env python3
"""
Seed REVIV database with OpenLitterMap data.

Fetches real litter reports (location + photos) from the public
OpenLitterMap /global/points API and inserts them as Report documents.

Usage:
    cd backend
    python seed_openlittermap.py                        # all cities
    python seed_openlittermap.py --cities "Dublin,London"
    python seed_openlittermap.py --limit 200            # cap total inserts
    python seed_openlittermap.py --zoom 12              # lower zoom = wider area
"""

import json
import os
import sys
import argparse
from datetime import datetime
from urllib import request as urllib_request
from urllib.parse import urlencode
from bson import ObjectId
from pymongo import MongoClient

# ── Config ────────────────────────────────────────────────────────────────────

def _load_mongo_url() -> tuple[str, str]:
    """Read MONGODB_URL and DATABASE_NAME from backend/.env if present."""
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    url  = "mongodb://localhost:27017"
    name = "reviv"
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line.startswith("MONGODB_URL="):
                    url = line.split("=", 1)[1].strip()
                elif line.startswith("DATABASE_NAME="):
                    name = line.split("=", 1)[1].strip()
    return url, name

MONGO_URL, DB_NAME = _load_mongo_url()
OLM_BASE  = "https://openlittermap.com"

# OLM stores photos on S3 — filename field contains the relative path
OLM_PHOTO_BASE = "https://openlittermap.s3.amazonaws.com"

# City bounding boxes: (min_lng, min_lat, max_lng, max_lat)
CITY_BBOXES = {
    "Dublin":        (-6.34,   53.29, -6.20,   53.39),
    "London":        (-0.20,   51.46,  0.00,   51.56),
    "San Francisco": (-122.52, 37.70, -122.35, 37.83),
    "New York":      (-74.03,  40.68, -73.92,  40.78),
    "Los Angeles":   (-118.35, 34.01, -118.20, 34.09),
    "Chicago":       (-87.72,  41.83, -87.60,  41.91),
    "Sydney":        (151.10, -33.93, 151.25, -33.82),
    "Berlin":        (13.33,   52.47, 13.51,   52.56),
    "Paris":         (2.29,    48.83,  2.41,   48.90),
    "Melbourne":     (144.93, -37.84, 145.00, -37.80),
}

# ── Category/severity derivation ──────────────────────────────────────────────

_ILLEGAL_DUMP  = {"dumping", "fly tip", "fly-tip", "illegal dump", "flytipping"}
_CONSTRUCTION  = {"construction", "industrial", "building", "infrastructure", "scaffolding"}
_WATERWAY      = {"fishing", "ocean", "river", "stream", "water", "beach", "coast", "marine", "sea", "lake"}
_PARK          = {"park", "forest", "trail", "garden", "grass", "nature", "recreation", "woodland", "field"}
_HIGH_SEVERITY = {"dumping", "illegal", "industrial", "hazardous", "large"}


def derive_category(result_string: str) -> str:
    lower = result_string.lower()
    if any(k in lower for k in _ILLEGAL_DUMP):
        return "illegal_dump"
    if any(k in lower for k in _CONSTRUCTION):
        return "construction"
    if any(k in lower for k in _WATERWAY):
        return "waterway"
    if any(k in lower for k in _PARK):
        return "park"
    return "roadside"


def derive_severity(result_string: str) -> str:
    lower = result_string.lower()
    if any(k in lower for k in _HIGH_SEVERITY):
        return "high"
    # Count distinct tag words as a proxy for volume of litter
    tokens = [t.strip() for t in result_string.replace(",", " ").split() if t.strip()]
    if len(tokens) >= 4:
        return "high"
    if len(tokens) >= 2:
        return "medium"
    return "low"


def parse_olm_datetime(dt_str: str) -> datetime:
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(dt_str, fmt)
        except ValueError:
            continue
    return datetime.utcnow()


def validated_lnglat(lat_val, lng_val):
    """
    Return (lat, lng) as floats, or None if coordinates are unusable.
    Auto-swaps if lat/lng appear to be transposed (common in older OLM records).
    """
    try:
        a, b = float(lat_val), float(lng_val)
    except (TypeError, ValueError):
        return None
    if -90 <= a <= 90 and -180 <= b <= 180:
        return a, b       # already correct
    if -90 <= b <= 90 and -180 <= a <= 180:
        return b, a       # transposed — swap them
    return None           # genuinely out of range on both axes


_RENDERABLE = (".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif")

def build_photo_url(filename: str) -> str | None:
    """
    Return a usable photo URL from an OLM filename field, or None to skip.
    Skips: placeholder assets, HEIC/HEIF and other non-browser-renderable formats.
    """
    if not filename:
        return None
    if "/assets/" in filename:
        return None
    url = filename if filename.startswith("http") else f"{OLM_PHOTO_BASE}/{filename.lstrip('/')}"
    # Drop formats browsers cannot natively render
    lower = url.split("?")[0].lower()
    if not any(lower.endswith(ext) for ext in _RENDERABLE):
        return None
    return url

# ── OLM fetch ─────────────────────────────────────────────────────────────────

def fetch_olm_points(bbox: tuple, zoom: int) -> list:
    left, bottom, right, top = bbox
    params = {
        "zoom":         zoom,
        "bbox[left]":   left,
        "bbox[bottom]": bottom,
        "bbox[right]":  right,
        "bbox[top]":    top,
    }
    url = f"{OLM_BASE}/global/points?" + urlencode(params)
    req = urllib_request.Request(url, headers={
        "Accept":     "application/json, text/plain, */*",
        "User-Agent": "REVIV-Seeder/1.0 (openlittermap data import)",
    })
    try:
        with urllib_request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as exc:
        print(f"    HTTP error: {exc}")
        return []


def extract_features(data) -> list:
    """Accept both GeoJSON FeatureCollection and plain array."""
    if isinstance(data, dict) and data.get("type") == "FeatureCollection":
        return data.get("features", [])
    if isinstance(data, list):
        return data
    return []


def feature_to_doc(feature: dict, system_user_id: ObjectId) -> dict | None:
    # ── Extract raw lat/lng and properties regardless of response format ──
    if isinstance(feature, dict) and feature.get("type") == "Feature":
        props  = feature.get("properties") or {}
        geom   = feature.get("geometry") or {}
        c      = geom.get("coordinates", [None, None])
        # GeoJSON standard is [lng, lat], but OLM historically sometimes emits
        # [lat, lng] — we'll validate both orderings below via validated_lnglat
        raw_a, raw_b = c[0], c[1]
        # Prefer explicit named fields in properties when available (unambiguous)
        raw_lat = props.get("lat") or raw_a
        raw_lng = props.get("lon") or props.get("lng") or raw_b
    else:
        props   = feature
        raw_lat = props.get("lat")
        raw_lng = props.get("lon") or props.get("lng")

    result = validated_lnglat(raw_lat, raw_lng)
    if result is None:
        return None
    lat, lng = result

    result_string = (props.get("result_string") or "").strip()
    filename      = (props.get("filename") or "").strip()
    dt_raw        = (props.get("datetime") or "").strip()

    photo_url = build_photo_url(filename)
    photo_urls = [photo_url] if photo_url else []

    return {
        "submitted_by":    system_user_id,
        "location":        {"type": "Point", "coordinates": [lng, lat]},
        "location_label":  None,
        "severity":        derive_severity(result_string),
        "category":        derive_category(result_string),
        "description":     result_string or "Imported from OpenLitterMap",
        "photo_urls":      photo_urls,
        "upvotes":         [],
        "upvote_count":    0,
        "status":          "active",
        "linked_event_id": None,
        "created_at":      parse_olm_datetime(dt_raw) if dt_raw else datetime.utcnow(),
        "resolved_at":     None,
    }

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Seed REVIV with OpenLitterMap data")
    parser.add_argument("--cities", default="",
                        help="Comma-separated city names (default: all)")
    parser.add_argument("--limit",  type=int, default=0,
                        help="Max total reports to insert (0 = unlimited)")
    parser.add_argument("--zoom",   type=int, default=14,
                        help="OLM zoom level — higher = more individual points, lower = wider area (default: 14)")
    args = parser.parse_args()

    cities = [c.strip() for c in args.cities.split(",") if c.strip()] if args.cities else list(CITY_BBOXES)
    unknown = [c for c in cities if c not in CITY_BBOXES]
    if unknown:
        print(f"Unknown cities: {unknown}")
        print(f"Available: {list(CITY_BBOXES)}")
        sys.exit(1)

    # ── Connect ───────────────────────────────────────────────────────────
    client  = MongoClient(MONGO_URL)
    db      = client[DB_NAME]
    users   = db["users"]
    reports = db["reports"]

    # ── Get or create OLM system user ─────────────────────────────────────
    system_user = users.find_one({"email": "olm-import@reviv.internal"})
    if system_user:
        system_user_id = system_user["_id"]
        print(f"Using existing OLM system user  {system_user_id}")
    else:
        res = users.insert_one({
            "email":          "olm-import@reviv.internal",
            "hashed_password": "",
            "display_name":   "OpenLitterMap Import",
            "avatar_url":     None,
            "location":       {"type": "Point", "coordinates": [0, 0]},
            "created_at":     datetime.utcnow(),
            "is_verified":    True,
            "stats": {
                "events_attended":      0,
                "events_organized":     0,
                "total_volunteer_hours": 0,
                "reports_submitted":    0,
                "reports_resolved":     0,
            },
        })
        system_user_id = res.inserted_id
        print(f"Created OLM system user  {system_user_id}")

    total_inserted = 0

    for city in cities:
        if args.limit and total_inserted >= args.limit:
            break

        bbox = CITY_BBOXES[city]
        left, bottom, right, top = bbox
        print(f"\n── {city} ──────────────────────────────────────────────")
        print(f"   bbox ({left}, {bottom}) → ({right}, {top})  zoom={args.zoom}")

        raw      = fetch_olm_points(bbox, args.zoom)
        features = extract_features(raw)
        print(f"   OLM returned {len(features)} features")

        if not features:
            continue

        # Build candidate docs
        docs = []
        for f in features:
            doc = feature_to_doc(f, system_user_id)
            if doc:
                docs.append(doc)
        print(f"   {len(docs)} valid points after parsing")

        # Deduplicate against existing reports within the bbox
        existing_coords = set()
        for r in reports.find(
            {"location": {"$geoWithin": {"$box": [[left, bottom], [right, top]]}}},
            {"location": 1},
        ):
            c = r["location"]["coordinates"]
            existing_coords.add((round(c[0], 6), round(c[1], 6)))

        new_docs = []
        for doc in docs:
            c   = doc["location"]["coordinates"]
            key = (round(c[0], 6), round(c[1], 6))
            if key not in existing_coords:
                new_docs.append(doc)
                existing_coords.add(key)   # prevent within-batch dupes

        if args.limit:
            remaining = args.limit - total_inserted
            new_docs  = new_docs[:remaining]

        if not new_docs:
            print(f"   All points already in DB — skipped")
            continue

        reports.insert_many(new_docs, ordered=False)
        total_inserted += len(new_docs)
        skipped = len(docs) - len(new_docs)
        print(f"   Inserted {len(new_docs)}  |  skipped {skipped} duplicates")

    print(f"\nDone. Total inserted: {total_inserted}")
    client.close()


if __name__ == "__main__":
    main()
