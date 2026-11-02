from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, String, DateTime, UniqueConstraint, Index
from backend.app.core.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class ActualGeneration(Base):
    __tablename__ = "actual_generation"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    start_time = Column(DateTime(timezone=True), nullable=False, index=True)
    settlement_period = Column(Integer, nullable=False)
    settlement_date = Column(String(10), nullable=False, index=True)
    fuel_type = Column(String(32), nullable=False, default="WIND")
    generation_mw = Column(Float, nullable=False)
    publish_time = Column(DateTime(timezone=True), nullable=False)
    ingested_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("start_time", "fuel_type", name="uq_actual_start_fuel"),
    )


class ForecastGeneration(Base):
    __tablename__ = "forecast_generation"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    start_time = Column(DateTime(timezone=True), nullable=False, index=True)
    publish_time = Column(DateTime(timezone=True), nullable=False, index=True)
    generation_mw = Column(Float, nullable=False)
    dataset = Column(String(32), nullable=False, default="WINDFOR")
    ingested_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("start_time", "publish_time", name="uq_forecast_start_publish"),
        Index("idx_forecast_start_publish", "start_time", "publish_time"),
    )
