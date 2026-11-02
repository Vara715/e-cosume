import logging
import httpx
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


class ElexonClient:
    """HTTP Client for querying the Elexon BMRS API endpoints with retry and error handling."""

    def __init__(self, base_url: str = "https://data.elexon.co.uk/bmrs/api/v1", timeout: float = 30.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def _format_time(self, dt: datetime) -> str:
        """Ensure datetime is UTC formatted as ISO 8601 string with trailing Z."""
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        else:
            dt = dt.astimezone(timezone.utc)
        return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

    def fetch_fuelhh(
        self,
        publish_from: datetime,
        publish_to: datetime,
        fuel_type: str = "WIND",
        max_retries: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Fetch FUELHH stream dataset from Elexon BMRS.
        Filters by fuelType ('WIND' by default).
        """
        url = f"{self.base_url}/datasets/FUELHH/stream"
        params = {
            "publishDateTimeFrom": self._format_time(publish_from),
            "publishDateTimeTo": self._format_time(publish_to)
        }

        records = self._get_with_retry(url, params, max_retries)
        if not isinstance(records, list):
            logger.warning(f"Unexpected FUELHH response type: {type(records)}")
            return []

        # Filter strictly for fuel_type if specified
        if fuel_type:
            target_fuel = fuel_type.upper()
            records = [r for r in records if r.get("fuelType", "").upper() == target_fuel]

        logger.info(f"Retrieved {len(records)} FUELHH {fuel_type} records for {params['publishDateTimeFrom']} to {params['publishDateTimeTo']}")
        return records

    def fetch_windfor(
        self,
        publish_from: datetime,
        publish_to: datetime,
        max_retries: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Fetch WINDFOR stream dataset from Elexon BMRS.
        Returns rolling wind forecast publications.
        """
        url = f"{self.base_url}/datasets/WINDFOR/stream"
        params = {
            "publishDateTimeFrom": self._format_time(publish_from),
            "publishDateTimeTo": self._format_time(publish_to)
        }

        records = self._get_with_retry(url, params, max_retries)
        if not isinstance(records, list):
            logger.warning(f"Unexpected WINDFOR response type: {type(records)}")
            return []

        logger.info(f"Retrieved {len(records)} WINDFOR records for {params['publishDateTimeFrom']} to {params['publishDateTimeTo']}")
        return records

    def _get_with_retry(self, url: str, params: Dict[str, str], max_retries: int) -> Any:
        client = httpx.Client(timeout=self.timeout, headers={"User-Agent": "UK-Wind-Analytics-Platform/1.0"})
        last_error = None

        for attempt in range(1, max_retries + 1):
            try:
                response = client.get(url, params=params)
                response.raise_for_status()
                return response.json()
            except (httpx.HTTPError, httpx.TimeoutException) as exc:
                last_error = exc
                logger.warning(f"Attempt {attempt}/{max_retries} failed for {url} with params {params}: {exc}")
                if attempt < max_retries:
                    import time
                    time.sleep(1.0 * (2 ** (attempt - 1)))  # Exponential backoff
            finally:
                if attempt == max_retries:
                    client.close()

        client.close()
        raise RuntimeError(f"Failed to fetch data from {url} after {max_retries} attempts: {last_error}")
