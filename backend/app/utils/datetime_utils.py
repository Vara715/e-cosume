from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from typing import Optional

LONDON_TZ = ZoneInfo("Europe/London")
UTC_TZ = timezone.utc


def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Normalize any datetime (naive or aware) to UTC-aware datetime."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC_TZ)
    return dt.astimezone(UTC_TZ)


def to_london(dt: Optional[datetime]) -> Optional[datetime]:
    """Convert a UTC datetime to Europe/London local time."""
    if dt is None:
        return None
    utc_dt = ensure_utc(dt)
    return utc_dt.astimezone(LONDON_TZ)


def to_iso_utc(dt: Optional[datetime]) -> Optional[str]:
    """Return ISO 8601 string formatted with trailing 'Z'."""
    if dt is None:
        return None
    utc_dt = ensure_utc(dt)
    return utc_dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def get_settlement_period(dt: datetime) -> int:
    """
    Calculate UK half-hourly settlement period (1 to 48) from a UTC datetime.
    Period 1: 00:00 - 00:30
    Period 2: 00:30 - 01:00
    ...
    Period 48: 23:30 - 00:00
    """
    utc_dt = ensure_utc(dt)
    minutes_from_midnight = utc_dt.hour * 60 + utc_dt.minute
    sp = (minutes_from_midnight // 30) + 1
    return min(max(sp, 1), 48)


def get_half_hour_start(dt: datetime) -> datetime:
    """Floor datetime to the start of its half-hour interval."""
    utc_dt = ensure_utc(dt)
    minute = 0 if utc_dt.minute < 30 else 30
    return utc_dt.replace(minute=minute, second=0, microsecond=0)


def get_hour_start(dt: datetime) -> datetime:
    """Floor datetime to the top of the hour."""
    utc_dt = ensure_utc(dt)
    return utc_dt.replace(minute=0, second=0, microsecond=0)
