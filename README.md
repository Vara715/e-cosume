# e-consumption
### UK Wind Generation Forecast & Procurement Analytics Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4+-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?logo=docker&logoColor=white)](https://www.docker.com)
[![Pytest](https://img.shields.io/badge/Pytest-13%20Passed-green)](https://docs.pytest.org)
[![Vitest](https://img.shields.io/badge/Vitest-4%20Passed-green)](https://vitest.dev)

---

## 1. Executive Summary & Business Context

In the UK wholesale electricity market, commercial utility procurement teams purchase power one day ahead ($D-1$) in daily wholesale auctions (e.g., EPEX SPOT UK Day-Ahead Auction and Nord Pool GB). 

Because wind generation is weather-dependent and non-dispatchable, procurement desks must forecast anticipated wind output across all 48 half-hourly settlement periods to determine how much residual thermal, hydro, or storage power must be secured in the auction:

$$\text{Residual Volume to Procure} = \text{Consumer Demand} - \text{Expected Wind Generation} - \text{Baseload Contracts}$$

### Volume Risk & Commercial Imbalance Exposure
* **Over-forecasting Wind ($\text{Forecast} > \text{Actual}$):** The utility procures too little conventional power day-ahead. During physical delivery, a generation deficit emerges. The utility is exposed to volatile cash-out imbalance penalties (System Buy Price) or emergency intraday balancing actions.
* **Under-forecasting Wind ($\text{Forecast} < \text{Actual}$):** The utility over-procures expensive thermal power. In real time, a physical surplus occurs, forcing the utility to spill power or sell it at discounted (or negative) System Sell Prices.

### Eliminating Lookahead Bias (The Core Requirement)
Day-ahead trading decisions close strictly at **11:00 GMT on $D-1$** (EPEX Day-Ahead auction gate closure). Evaluating procurement decisions against forecast revisions published later (e.g., intraday updates published 2 hours prior to physical delivery) introduces severe **lookahead bias (data leakage)**. 

This platform reconstructs the exact **frozen day-ahead forecast view** available commercially prior to the configured gate closure cutoff, matches it against delivered actuals for January 2026, and provides transparent accuracy, error distribution, and volumetric imbalance metrics.

---

## 2. Key Features

1. **Point-in-Time Day-Ahead Forecast Reconstruction:**
   * Strictly filters all forecast publications: $T_{\text{publish}} \le \text{Cutoff}_{D-1}$.
   * Dynamically selects the latest eligible forecast published prior to cutoff (default: **11:00 GMT on $D-1$**).
   * Fully configurable cutoffs (11:00 EPEX Spot, 12:00 Nord Pool, 16:00 Desk Close, 17:00 Evening Final).
2. **Preservation of Full Revision History:**
   * Ingests and retains all historical publications without overwriting.
   * Enables backtesting, auditability, and forecast drift analysis.
3. **Dual Enterprise Design System:**
   * **Previse Coral Dark Enterprise Theme:** Slate navy trading desk aesthetic (`#0b131b` / `#13222f`) with high-contrast cyan, amber, and emerald stepped curves.
   * **ML6 Light Minimalist Theme:** Clean white and slate aesthetic with executive metric sidebars and stepped lines.
   * Instant one-click toggle with persisted preference.
4. **Interactive Analytical Modules:**
   * **Overview Dashboard:** Executive stats (Daily Avg, Peak MW, Actual Mean, Daily MAE, Directional Bias, Completeness) + 24-hour stepped profile + error delta bars + interval audit table.
   * **Actual vs. Forecast Comparison:** Multi-day continuous timeseries with brush zoom/pan, CSV export, and Parity Scatter Plot with $y = x$ reference line.
   * **Accuracy Analytics:** Statistical KPIs (MAE, RMSE, WAPE, Bias, Max AE, Median AE) + Daily performance bar chart + 24-hour Diurnal curve + 8-bin Error Distribution Histogram.
   * **Forecast Evolution Explorer:** Deep-dive into specific delivery hours (e.g., 17:00 evening peak) tracking the trajectory across 20+ revisions from $D-2$ through delivery.
   * **Illustrative Procurement Simulator:** Interactive baseline demand slider modeling residual procurement swings and volume shortfall/surplus exposure with explicit methodology notices.

---

## 3. Architecture & Tech Stack

```mermaid
flowchart TD
    subgraph Data Sources [Elexon BMRS API]
        FUELHH["FUELHH Stream<br/>(Half-Hourly Actual Wind)"]
        WINDFOR["WINDFOR Stream<br/>(Rolling 73-Hour Forecasts)"]
    end

    subgraph Backend [FastAPI Application]
        INGEST["Ingestion Service<br/>(Batching, UTC Normalization, Deduplication)"]
        DB[(PostgreSQL / SQLite)]
        RECON["Reconstruction Service<br/>(Point-in-Time D-1 Cutoff Engine)"]
        ANALYTICS["Analytics Service<br/>(MAE, RMSE, WAPE, Bias, Distribution)"]
        SCENARIO["Scenario Simulator<br/>(Residual Volume Imbalance)"]
        API["REST API Router<br/>(OpenAPI / FastAPI)"]
    end

    subgraph Frontend [React + Vite + TypeScript]
        ROUTER["State & Query Management"]
        THEME["Theme Context<br/>(Previse Dark / ML6 Light)"]
        VIEWS["Dashboard Views<br/>(Overview, Comparison, Accuracy, Evolution, Simulator)"]
        CHARTS["Recharts Visualization Engine<br/>(Stepped Curves, Histograms, Parity Scatter)"]
    end

    FUELHH --> INGEST
    WINDFOR --> INGEST
    INGEST --> DB
    DB --> RECON
    RECON --> ANALYTICS
    ANALYTICS --> API
    SCENARIO --> API
    API --> ROUTER
    ROUTER --> VIEWS
    THEME --> VIEWS
    VIEWS --> CHARTS
```

### Technology Decisions
* **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide React.
* **Backend:** Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2, NumPy, Pandas, httpx.
* **Database:** PostgreSQL (production on Render / Docker) with zero-setup SQLite fallback for local development.
* **Containerization:** Multi-stage Dockerfiles and Docker Compose.
* **Testing:** Pytest (13 tests) and Vitest (4 tests).

---

## 4. Empirical Elexon API Data Characteristics

The platform connects to live Elexon Insights Solution (BMRS) open data streams without authentication:

### A. Actual Generation (`FUELHH`)
* **Endpoint:** `https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream`
* **Filter:** `fuelType = "WIND"`
* **Granularity:** Half-hourly settlement periods (SP 1–48 per day).
* **Delivery Ingestion:** Jan 1, 2026 00:00 to Jan 31, 2026 23:30 (1,489 records captured).

### B. Forecast Generation (`WINDFOR`)
* **Endpoint:** `https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream`
* **Cadence:** Published approximately 8 times per day at `:30` past the hour.
* **Granularity:** Hourly start times (`startTime` minute is `:00`).
* **Horizon:** Each snapshot publishes a **73-hour rolling horizon**.
* **Ingestion Window:** Commences Dec 28, 2025 to capture day-ahead forecasts for Jan 1, 2026 delivery (20,440 records captured).

### Resolution Harmonization (Hourly vs. Half-Hourly)
`WINDFOR` forecasts are issued at hourly resolution, while `FUELHH` actuals are issued at half-hourly settlement periods. The primary analytical engine pairs each hourly forecast with the average of its two constituent half-hourly settlement periods:

$$\text{Actual}_H = \frac{\text{Actual}_{H:00} + \text{Actual}_{H:30}}{2}$$

---

## 5. Mathematical Metric Definitions

Let $y_t$ be delivered actual generation (MW) and $\hat{y}_t(c)$ be the latest forecast published on or before cutoff $c$ on $D-1$:

$$\text{Forecast Error } (\Delta_t) = \hat{y}_t(c) - y_t$$

1. **Mean Absolute Error (MAE):**
   $$\text{MAE} = \frac{1}{N} \sum_{t=1}^{N} |\hat{y}_t - y_t|$$
2. **Root Mean Squared Error (RMSE):**
   $$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{t=1}^{N} (\hat{y}_t - y_t)^2}$$
3. **Weighted Absolute Percentage Error (WAPE):**
   $$\text{WAPE} = \frac{\sum_{t=1}^{N} |\hat{y}_t - y_t|}{\sum_{t=1}^{N} y_t} \times 100\% \quad (\text{safe zero-denominator check})$$
4. **Forecast Bias (Mean Error):**
   $$\text{Bias} = \frac{1}{N} \sum_{t=1}^{N} (\hat{y}_t - y_t)$$
   * $\text{Bias} > 0$: Systematic over-forecasting (Shortfall / under-procurement exposure).
   * $\text{Bias} < 0$: Systematic under-forecasting (Surplus / over-procurement exposure).
5. **Data Completeness:**
   $$\text{Completeness} = \frac{N_{\text{valid}}}{N_{\text{expected}}} \times 100\%$$

---

## 6. Database Schema Design

Normalized PostgreSQL schema with unique constraints and composite indexes:

### `actual_generation`
| Column | Type | Constraints / Indexes |
|---|---|---|
| `id` | Integer | Primary Key, Autoincrement |
| `start_time` | Timestamp (tz) | NOT NULL, Indexed |
| `settlement_period` | Integer | NOT NULL (1–48) |
| `settlement_date` | String(10) | NOT NULL, Indexed |
| `fuel_type` | String(32) | NOT NULL, Default 'WIND' |
| `generation_mw` | Float | NOT NULL |
| `publish_time` | Timestamp (tz) | NOT NULL |
| `ingested_at` | Timestamp (tz) | NOT NULL, Default UTC now |
| **Constraint** | `UNIQUE (start_time, fuel_type)` | Idempotent deduplication |

### `forecast_generation`
| Column | Type | Constraints / Indexes |
|---|---|---|
| `id` | Integer | Primary Key, Autoincrement |
| `start_time` | Timestamp (tz) | NOT NULL, Indexed |
| `publish_time` | Timestamp (tz) | NOT NULL, Indexed |
| `generation_mw` | Float | NOT NULL |
| `dataset` | String(32) | NOT NULL, Default 'WINDFOR' |
| `ingested_at` | Timestamp (tz) | NOT NULL, Default UTC now |
| **Constraint** | `UNIQUE (start_time, publish_time)` | Preserves full publication history |
| **Index** | `idx_forecast_start_publish` | Fast point-in-time range queries |

### `ingestion_runs`
Audit table recording dataset name, requested ranges, records received, records inserted, status (`SUCCESS` / `FAILED`), and error details.

---

## 7. Local Setup & Quickstart

### Prerequisites
* Python 3.11+
* Node.js v20+ and npm

### 1. Clone & Set Up Backend
```bash
# Clone the repository
git clone <repo-url>
cd <repo-dir>

# Install backend dependencies
pip install -r backend/requirements.txt

# Run backend test suite
python -m pytest backend/tests -v
```

### 2. Populate Database (January 2026 Ingestion)
```bash
# Ingests January 2026 actuals (1,489 records) and forecasts from Dec 28, 2025 to Feb 1, 2026 (20,440 records)
python -m backend.app.ingestion.pipeline
```

### 3. Launch Backend API Server
```bash
python -m uvicorn backend.app.main:app --port 8000 --reload
# API Docs available at http://localhost:8000/docs
```

### 4. Launch Frontend Application
```bash
cd frontend
npm install

# Run frontend test suite
npm run test

# Launch Vite dev server
npm run dev
# Dashboard accessible at http://localhost:5173
```

---

## 8. Docker & Docker Compose Setup

Run the entire multi-service stack with a single command:

```bash
docker compose up --build
```
* **Frontend:** http://localhost:3000
* **Backend API & Swagger Docs:** http://localhost:8000/docs
* **PostgreSQL:** `localhost:5432` (`postgres:postgres`, database `wind_procurement`)

---

## 9. Production Deployment Guide

### Backend & Database on Render
1. Push this repository to GitHub.
2. In the Render Dashboard, click **New +** > **Blueprint**.
3. Select this repository. Render automatically reads `render.yaml`:
   * Provisions a managed PostgreSQL instance (`e-consumption-postgres`).
   * Builds and deploys the FastAPI web service (`e-consumption-api`).
   * Automatically sets `DATABASE_URL` from the database connection string.
4. Run the ingestion script once via Render Shell or SSH:
   ```bash
   python -m backend.app.ingestion.pipeline
   ```

### Frontend on Vercel
1. In Vercel, click **Add New Project** and select this repository.
2. Set the **Root Directory** to `frontend`.
3. Set the Environment Variable:
   * `VITE_API_URL` = `https://<your-render-backend-url>/api/v1`
4. Click **Deploy**. Vercel will build and serve the single-page application with automatic SPA routing.

---

## 10. Test Execution Results

### Backend Pytest Suite
```
backend/tests/test_analytics.py::test_deterministic_metric_calculations PASSED
backend/tests/test_analytics.py::test_zero_actual_generation_wape_safety PASSED
backend/tests/test_analytics.py::test_systematic_under_forecasting_bias PASSED
backend/tests/test_api.py::test_api_health PASSED
backend/tests/test_api.py::test_api_metadata PASSED
backend/tests/test_api.py::test_api_overview PASSED
backend/tests/test_api.py::test_api_comparison PASSED
backend/tests/test_api.py::test_api_accuracy PASSED
backend/tests/test_api.py::test_api_scenario_simulation PASSED
backend/tests/test_api.py::test_api_invalid_date_format PASSED
backend/tests/test_reconstruction.py::test_day_ahead_selection_excludes_future_publications PASSED
backend/tests/test_reconstruction.py::test_reconstruction_with_alternative_cutoff PASSED
backend/tests/test_reconstruction.py::test_forecast_history_tracking PASSED

======================== 13 passed in 0.93s ========================
```

### Frontend Vitest Suite
```
 PASS src/tests/MetricCard.test.tsx (2 tests)
 PASS src/tests/TabsNav.test.tsx (2 tests)

Test Files  2 passed (2)
     Tests  4 passed (4)
======================== 4 passed in 1.55s ========================
```

---

## 11. Known Domain Limitations & Honest Engineering Boundary

1. **Exclusion of Consumer Demand:**
   The assignment explicitly excludes consumer demand datasets. Consequently, the platform **does not claim to compute true net commercial trade volumes or monetary trading positions**. Doing so without actual national demand data would be misleading. Instead, the platform focuses directly on **wind forecast uncertainty and volumetric delta exposure**, complemented by an interactive Illustrative Demand Simulator clearly labeled as a sensitivity tool.
2. **Hourly vs. Half-Hourly Resolution:**
   `WINDFOR` is published at hourly resolution, while `FUELHH` is published half-hourly. The platform averages the two half-hours to guarantee fair, physically valid energy comparisons while allowing users to inspect raw interval breakdowns.

---

## 12. AI Tools Disclosure

This application was engineered and developed using **Google Antigravity**, operating with an autonomous senior full-stack engineering workflow spanning domain research, Elexon API investigation, statistical modeling, database design, frontend implementation, testing, containerization, and documentation.
