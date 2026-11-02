from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Text
from backend.app.core.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class IngestionRun(Base):
    __tablename__ = "ingestion_runs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    dataset = Column(String(32), nullable=False)
    range_start = Column(DateTime(timezone=True), nullable=True)
    range_end = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(32), nullable=False, default="RUNNING")  # RUNNING, SUCCESS, FAILED
    records_received = Column(Integer, default=0, nullable=False)
    records_inserted = Column(Integer, default=0, nullable=False)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
