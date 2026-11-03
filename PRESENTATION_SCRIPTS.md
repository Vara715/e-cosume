# e-consumption Platform
## UK Wind Generation Forecast Analytics
## Video Presentation Scripts & Demonstration Guide

**Total Duration:** Maximum 10 minutes  
**Format:** Two-Part Video (Part 1: Commercial / Client Presentation; Part 2: Technical Review)  
**Target Delivery Window:** January 2026 Elexon BMRS Datasets  

---

# PART 1: Client & Procurement Desk Presentation (Max 5 Minutes)
*Tone: Professional, persuasive, commercially focused, executive.*  
*Target Audience: Head of Electricity Procurement, Energy Traders, Risk Analysts.*

---

### Segment 1: The Commercial Challenge & Lookahead Bias (0:00 – 1:00)
**Screen Cue:** Title slide -> Transition into the **Overview Dashboard** with Previse Dark Trading Theme enabled.

**Spoken Script:**
> "Good morning. In the UK wholesale electricity market, commercial procurement decisions for delivery day $D$ must be committed on day $D-1$ before gate closure—typically at 11:00 GMT for the EPEX Day-Ahead auction.
> 
> As wind generation accounts for a larger share of the GB power stack, procurement teams face substantial volume risk. Over-estimating wind generation leads to under-procurement of conventional power, exposing the desk to expensive cash-out imbalance penalties when generation falls short. Under-estimating wind output leads to over-procuring expensive baseload contracts, forcing us to dump surplus energy at heavily discounted or negative intraday prices.
> 
> The central analytical challenge is **lookahead bias**. If your analytics team evaluates forecast performance using the latest forecast issued minutes before physical dispatch, you are evaluating an intraday operational forecast that was not commercially available when trading closed.
> 
> We have built the **e-consumption platform** to solve this exact problem: reconstructing the frozen day-ahead view available at gate closure, auditing historical accuracy, and quantifying our true imbalance exposure."

---

### Segment 2: Live Overview Dashboard & Day Profile (1:00 – 2:00)
**Screen Cue:** Hover over Executive Metric Cards (DA Avg, Peak MW, Actual Mean, Daily MAE, Directional Bias). Scroll to the stepped line chart and delta bar chart.

**Spoken Script:**
> "Here on the **Overview Dashboard**, we are inspecting January 15, 2026. Notice our top bar: the platform is evaluating our benchmark cutoff of **11:00 GMT on $D-1$**. 
> 
> At a glance, the desk immediately sees key daily metrics: an average day-ahead forecast of 11,678 MW, an actual delivered generation of 10,750 MW, a daily Mean Absolute Error of 1,226 MW, and a positive bias indicating systematic over-forecasting.
> 
> Below, our stepped generation curve mirrors physical dispatch. The amber stepped line shows the day-ahead forecast locked in at gate closure, while the solid green line displays actual delivered generation. The cyan delta bar beneath highlights interval-by-interval exposure: intervals where delta is positive represent shortfall risk where our utility was left short in the market."

---

### Segment 3: Continuous Timeseries & Parity Scatter Plot (2:00 – 3:00)
**Screen Cue:** Click on the **Actual vs Forecast** tab. Select the 'Full Jan 2026' preset. Drag the bottom brush to zoom into Week 2. Hover over the Parity Scatter Plot.

**Spoken Script:**
> "Navigating to the **Actual vs. Forecast** module, we observe the continuous profile across all 744 hours of January 2026. The interactive brush allows our analysts to zoom into volatile storm fronts or calm lulls in seconds.
> 
> On the right, our **Parity Scatter Plot** plots delivered actuals on the X-axis against our day-ahead forecasts on the Y-axis. The red dashed line represents perfect parity ($y = x$). 
> 
> Points lying above the diagonal immediately expose over-forecasting events that drove shortfall risk, while points below represent surplus over-procurement. Over January 2026, 54% of intervals resulted in shortfall exposure and 46% in surplus exposure, giving our risk desk the exact statistical distribution of our volumetric imbalance."

---

### Segment 4: Statistical Accuracy & Diurnal Patterns (3:00 – 4:00)
**Screen Cue:** Click on the **Accuracy Analytics** tab. Point to MAE (1,348 MW), RMSE (1,780 MW), WAPE (11.2%), and the Diurnal Hour-of-Day curve.

**Spoken Script:**
> "Under **Accuracy Analytics**, we provide the rigorous statistical foundation required by risk management. We report Mean Absolute Error, RMSE, Weighted Absolute Percentage Error, and Directional Bias alongside the exact sample size of evaluated intervals.
> 
> A critical feature for trading desks is our **Diurnal Accuracy Profile** on the bottom left. Wind forecast accuracy is not uniform throughout the day. Notice how forecast error peaks between 16:00 and 19:00 UTC—coinciding exactly with the UK evening peak power demand. Identifying this pattern allows our traders to apply risk margins specifically during evening peak hours rather than treating all settlement periods uniformly.
> 
> To the right, our **Error Distribution Histogram** confirms the dispersion and tail risk of forecast errors, showing the frequency of large deviations exceeding $\pm 1,500$ MW."

---

### Segment 5: Forecast Evolution, Scenario Simulator & Boundary Honesty (4:00 – 5:00)
**Screen Cue:** Click on **Forecast Evolution**, select Hour 17:00, then switch to the **Procurement Simulator** and adjust the Demand Slider to 35,000 MW.

**Spoken Script:**
> "In the **Forecast Evolution** tab, we can inspect any specific delivery hour. For the 17:00 evening peak, our database preserves all 24 rolling Elexon publications. We can see how the forecast started at 12,000 MW two days prior, drifted, and was locked at 14,200 MW at our 11:00 cutoff.
> 
> Finally, in our **Procurement Simulator**, analysts can input hypothetical customer demand—for example, 35,000 MW—to simulate how wind variance shifts our residual thermal requirement.
> 
> In closing, I want to emphasize our technical honesty: because consumer demand data is not in the Elexon dataset, the platform clearly labels this simulator as illustrative sensitivity modeling. We do not fabricate demand curves or claim to calculate cash trading positions without real consumer data. What we deliver is an honest, mathematically sound, and point-in-time accurate wind uncertainty engine that empowers our procurement desk to trade with confidence."

---

# PART 2: Technical Architecture & Engineering Review (Max 5 Minutes)
*Tone: Precise, deep, software-architecture and data-engineering focused.*  
*Target Audience: Lead Architects, Data Engineers, DevOps, Senior Reviewers.*

---

### Segment 1: System Architecture & Tech Stack (0:00 – 1:00)
**Screen Cue:** Architecture Diagram from README / code repository structure.

**Spoken Script:**
> "Welcome to the technical review of the e-consumption platform.
> 
> The application is built on a modern decoupled architecture:
> * **Backend:** Python 3.11 with FastAPI for high-performance async REST endpoints, SQLAlchemy 2 for ORM, and NumPy/Pandas for vectorised statistical calculations.
> * **Database:** PostgreSQL in production with composite indexes, accompanied by an automatic SQLite fallback for zero-dependency local testing.
> * **Frontend:** React 18 with TypeScript, Vite, Tailwind CSS, and Recharts, implementing a dual theme engine (Previse Coral Dark `#0b131b` and ML6 Light `#ffffff`).
> * **Infrastructure:** Fully containerized with multi-stage Dockerfiles and Docker Compose for local orchestration, configured for Render backend hosting and Vercel frontend edge hosting."

---

### Segment 2: Empirical Elexon API Ingestion & Deduplication (1:00 – 2:00)
**Screen Cue:** Code review of `backend/app/ingestion/pipeline.py` and `backend/app/ingestion/elexon_client.py`.

**Spoken Script:**
> "Our data pipeline integrates directly with Elexon's live BMRS API streams:
> 1. `FUELHH` Stream: Supplies actual delivered generation half-hourly (settlement periods 1 to 48).
> 2. `WINDFOR` Stream: Supplies rolling wind generation forecasts published at hourly start times approximately 8 times per day, each containing a 73-hour rolling horizon.
> 
> A critical boundary requirement was January 1 delivery: day-ahead forecasts for January 1 were published before 11:00 GMT on December 31. Our ingestion window systematically begins on December 28, 2025.
> 
> In `backend/app/ingestion/pipeline.py`, we implement batching, exponential backoff retries, and strict UTC normalization. Deduplication is enforced both at the database level via composite unique constraints `(start_time, fuel_type)` on actuals and `(start_time, publish_time)` on forecasts, and in-memory via range-key sets, ensuring that re-running ingestion is 100% idempotent."

---

### Segment 3: Point-in-Time Day-Ahead Reconstruction Algorithm (2:00 – 3:00)
**Screen Cue:** Code review of `backend/app/services/reconstruction.py` (`reconstruct_day_ahead` method).

**Spoken Script:**
> "The core engine of this platform resides in `ReconstructionService`.
> 
> For any delivery date $D$, the algorithm:
> 1. Calculates the exact UTC cutoff timestamp on $D-1$: `cutoff_dt = datetime(D-1, cutoff_hour, cutoff_min, tz=UTC)`.
> 2. Queries all forecast records for date $D$ satisfying `publish_time <= cutoff_dt`.
> 3. Groups forecasts by hourly delivery interval and selects the candidate with the maximum publication timestamp—representing the latest information available to traders before the window closed.
> 4. To resolve the resolution mismatch between hourly `WINDFOR` forecasts and half-hourly `FUELHH` actuals, the algorithm pairs each hourly forecast with the average of its two half-hourly settlement periods: $\text{Actual}_H = (\text{Actual}_{H:00} + \text{Actual}_{H:30}) / 2$.
> 5. Computes errors, absolute errors, percentage errors, and flags volume shortfall vs. surplus exposure."

---

### Segment 4: Verification & Automated Test Suite (3:00 – 4:00)
**Screen Cue:** Terminal running `python -m pytest backend/tests -v` and `cd frontend && npx vitest run`.

**Spoken Script:**
> "Quality assurance and mathematical validity are verified through our automated test suites.
> 
> In `backend/tests/test_reconstruction.py`, our primary test deterministic fixture validates that given multiple publications for interval `2026-01-15 14:00` published at 06:00, 09:30, 11:30, 16:00, and intraday on Jan 15, the 11:00 cutoff selects the 09:30 publication (3,400 MW) and strictly excludes all later revisions.
> 
> In `backend/tests/test_analytics.py`, we verify deterministic hand-calculated mathematical outcomes for MAE, RMSE, WAPE, and Bias, including zero-denominator safety checks when wind output is zero.
> 
> In `frontend/tests/`, Vitest verifies component rendering, accessibility, and navigation state. All 13 backend tests and 4 frontend tests pass cleanly with zero warnings."

---

### Segment 5: Containerization, Deployment & Summary (4:00 – 5:00)
**Screen Cue:** Show `docker-compose.yml`, `render.yaml`, and `frontend/vercel.json`.

**Spoken Script:**
> "For deployment:
> * `docker-compose.yml` orchestrates PostgreSQL 16 with health checks, our FastAPI backend on port 8000, and our multi-stage Alpine Nginx frontend on port 3000.
> * For production cloud hosting, `render.yaml` defines a Render Blueprint that provisions a managed PostgreSQL instance and deploys the FastAPI container with automatic database URL injection.
> * The frontend deploys to Vercel with single-page application routing rules configured in `vercel.json`.
> 
> In summary, the e-consumption platform delivers enterprise-grade software engineering, strict domain accuracy, point-in-time backtesting integrity, and an intuitive user experience for UK power procurement professionals. Thank you."
