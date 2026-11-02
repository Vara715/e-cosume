import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_api_health():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "timestamp" in data


def test_api_metadata():
    response = client.get("/api/v1/metadata")
    assert response.status_code == 200
    data = response.json()
    assert "default_cutoff_time" in data
    assert "supported_cutoffs" in data
    assert "11:00" in data["supported_cutoffs"]


def test_api_overview():
    response = client.get("/api/v1/overview?delivery_date=2026-01-15&cutoff_time=11:00")
    assert response.status_code == 200
    data = response.json()
    assert data["delivery_date"] == "2026-01-15"
    assert "avg_forecast_mw" in data
    assert "intervals" in data


def test_api_comparison():
    response = client.get("/api/v1/comparison?start_date=2026-01-15&end_date=2026-01-16&cutoff_time=11:00")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if data:
        assert "forecast_mw" in data[0]
        assert "actual_mw" in data[0]
        assert "delta_mw" in data[0]


def test_api_accuracy():
    response = client.get("/api/v1/accuracy?start_date=2026-01-01&end_date=2026-01-31&cutoff_time=11:00")
    assert response.status_code == 200
    data = response.json()
    assert "mae" in data
    assert "rmse" in data
    assert "bias" in data
    assert "daily_metrics" in data
    assert "hourly_metrics" in data
    assert "error_distribution" in data


def test_api_scenario_simulation():
    payload = {
        "base_demand_mw": 30000.0,
        "start_date": "2026-01-15",
        "end_date": "2026-01-15",
        "cutoff_time": "11:00"
    }
    response = client.post("/api/v1/scenario/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["base_demand_mw"] == 30000.0
    assert "total_shortfall_mwh" in data
    assert "disclaimer" in data
    assert "intervals" in data


def test_api_invalid_date_format():
    response = client.get("/api/v1/overview?delivery_date=invalid-date")
    assert response.status_code == 400
