"""Build the northern lights indicator data for the site.

Combines NOAA's planetary Kp forecast (aurora activity) with MET Norway's
cloud cover forecast for Finnsnes, scored over our departure window, and
writes a small JSON file the site reads. Runs on a schedule in GitHub Actions.

Usage: python scripts/aurora_forecast.py <output.json>
Standard library only.
"""
from __future__ import annotations

import json
import math
import sys
import time
import urllib.request
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

LAT, LON = 69.2328, 17.9847  # Finnsnes harbour (MET asks for max 4 decimals)
OSLO = ZoneInfo("Europe/Oslo")
NIGHTS = 3

KP_URL = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json"
MET_URL = f"https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={LAT}&lon={LON}"
# MET Norway's terms require an identifying User-Agent.
USER_AGENT = "senjafjordtours.no aurora-indicator post@senjafjordtours.no"


def fetch_json(url: str) -> object:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(2):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.load(resp)
        except Exception:
            if attempt == 1:
                raise
            time.sleep(5)


def departure_window(night: date) -> tuple[datetime, datetime]:
    """Cruise departs 20:30 for 3 hours; 21:30 from 20 March as evenings get lighter."""
    hour, minute = (21, 30) if (night.month == 3 and night.day >= 20) else (20, 30)
    start = datetime(night.year, night.month, night.day, hour, minute, tzinfo=OSLO)
    return start, start + timedelta(hours=3)


def sun_elevation(when: datetime) -> float:
    """Approximate solar elevation in degrees (NOAA general solar position formulae)."""
    t = when.astimezone(timezone.utc)
    hour = t.hour + t.minute / 60
    g = 2 * math.pi / 365 * (t.timetuple().tm_yday - 1 + (hour - 12) / 24)
    eqtime = 229.18 * (0.000075 + 0.001868 * math.cos(g) - 0.032077 * math.sin(g)
                       - 0.014615 * math.cos(2 * g) - 0.040849 * math.sin(2 * g))
    decl = (0.006918 - 0.399912 * math.cos(g) + 0.070257 * math.sin(g)
            - 0.006758 * math.cos(2 * g) + 0.000907 * math.sin(2 * g)
            - 0.002697 * math.cos(3 * g) + 0.00148 * math.sin(3 * g))
    solar_minutes = hour * 60 + eqtime + 4 * LON
    hour_angle = math.radians(solar_minutes / 4 - 180)
    lat = math.radians(LAT)
    cos_zenith = (math.sin(lat) * math.sin(decl)
                  + math.cos(lat) * math.cos(decl) * math.cos(hour_angle))
    return 90 - math.degrees(math.acos(max(-1.0, min(1.0, cos_zenith))))


def max_kp(kp_rows: list, start: datetime, end: datetime) -> float | None:
    """Highest Kp in any 3-hour UTC block overlapping the window."""
    values = []
    for row in kp_rows:
        block = datetime.fromisoformat(row["time_tag"]).replace(tzinfo=timezone.utc)
        if block < end and block + timedelta(hours=3) > start and row.get("kp") is not None:
            values.append(float(row["kp"]))
    return max(values) if values else None


def mean_cloud(series: list, start: datetime, end: datetime) -> float | None:
    """Average cloud cover (%) in the window; widen by 3 h where MET is only 6-hourly."""
    def in_range(lo: datetime, hi: datetime) -> list[float]:
        out = []
        for step in series:
            ts = datetime.fromisoformat(step["time"].replace("Z", "+00:00"))
            cloud = step["data"]["instant"]["details"].get("cloud_area_fraction")
            if lo <= ts <= hi and cloud is not None:
                out.append(float(cloud))
        return out

    values = in_range(start, end) or in_range(start - timedelta(hours=3), end + timedelta(hours=3))
    return sum(values) / len(values) if values else None


def activity_factor(kp: float) -> float:
    # Finnsnes sits under the auroral oval, so even modest activity is often visible.
    if kp < 1:
        return 0.25
    if kp < 2:
        return 0.5
    if kp < 3:
        return 0.75
    return 1.0


def darkness_factor(elevation: float) -> float:
    if elevation < -12:
        return 1.0
    if elevation < -6:
        return 0.6
    return 0.2


def score_night(night: date, kp_rows: list, met_series: list) -> dict:
    start, end = departure_window(night)
    kp = max_kp(kp_rows, start, end)
    cloud = mean_cloud(met_series, start, end)
    elevation = sun_elevation(start + (end - start) / 2)

    entry = {
        "date": night.isoformat(),
        "start": start.isoformat(),
        "end": end.isoformat(),
        "kp": round(kp, 1) if kp is not None else None,
        "cloud": round(cloud) if cloud is not None else None,
        "dark": elevation < -12,
        "score": None,
        "level": None,
    }
    if kp is None or cloud is None:
        return entry

    score = activity_factor(kp) * (1 - cloud / 100) * darkness_factor(elevation)
    entry["score"] = round(score, 2)
    entry["level"] = "good" if score >= 0.5 else "fair" if score >= 0.25 else "low"
    return entry


def build(now: datetime | None = None) -> dict:
    now = now or datetime.now(timezone.utc)
    kp_rows = fetch_json(KP_URL)
    met_series = fetch_json(MET_URL)["properties"]["timeseries"]

    first = now.astimezone(OSLO).date()
    if now >= departure_window(first)[1]:
        first += timedelta(days=1)  # tonight's trip is already over

    return {
        "generated": now.isoformat(timespec="minutes"),
        "location": "Finnsnes",
        "nights": [score_night(first + timedelta(days=i), kp_rows, met_series) for i in range(NIGHTS)],
        "sources": {
            "kp": "NOAA Space Weather Prediction Center",
            "clouds": "MET Norway, CC BY 4.0",
        },
    }


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: aurora_forecast.py <output.json>")
    data = build()
    with open(sys.argv[1], "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2)
    for n in data["nights"]:
        print(n["date"], n["level"], "kp", n["kp"], "cloud", n["cloud"], "dark", n["dark"])
