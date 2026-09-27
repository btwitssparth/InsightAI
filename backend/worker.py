import logging
import os
import time
from datetime import datetime, timedelta, timezone

from app.api.analyses import _load_dataframe
from app.models.analysis import Analysis
from app.models.dataset import Dataset
from app.services.analysis_engine import execute_plan
from app.services.insight_generator import generate_insight
from app.services.planner import generate_analysis_plan
from app.services.profiler import profile_dataset
from app.services.visualization import generate_visualization
from database import SessionLocal

logger = logging.getLogger("insightai.worker")
POLL_INTERVAL_SECONDS = float(os.getenv("ANALYSIS_WORKER_POLL_INTERVAL", "2"))
JOB_TIMEOUT_SECONDS = int(os.getenv("ANALYSIS_JOB_TIMEOUT_SECONDS", "900"))

def _utc_now():
    return datetime.now(timezone.utc)

def _recover_stale_jobs():
    cutoff = _utc_now() - timedelta(seconds=JOB_TIMEOUT_SECONDS)
    with SessionLocal() as db:
        jobs = db.query(Analysis).filter(
            Analysis.status == "processing",
            Analysis.updated_at < cutoff,
        ).all()
        for analysis in jobs:
            analysis.status = "pending"
            analysis.error = "Previous worker stopped before completing this analysis."
            analysis.updated_at = _utc_now()
        if jobs:
            db.commit()

def _claim_job():
    with SessionLocal() as db:
        analysis = (
            db.query(Analysis)
            .filter(Analysis.status == "pending")
            .order_by(Analysis.created_at.asc())
            .with_for_update(skip_locked=True)
            .first()
        )
        if analysis is None:
            db.rollback()
            return None
        analysis.status = "processing"
        analysis.error = None
        analysis.updated_at = _utc_now()
        analysis_id = analysis.id
        db.commit()
        return analysis_id

def _process_job(analysis_id):
    with SessionLocal() as db:
        analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
        if analysis is None:
            return

        dataset = db.query(Dataset).filter(
            Dataset.id == analysis.dataset_id
        ).first()

        if dataset is None:
            analysis.status = "failed"
            analysis.error = "The dataset for this analysis no longer exists."
            analysis.updated_at = _utc_now()
            db.commit()
            return

        try:
            dataframe = _load_dataframe(dataset)
            dataset_profile = profile_dataset(dataframe)
            plan = generate_analysis_plan(
                question=analysis.question,
                dataset_profile=dataset_profile,
            )
            result = execute_plan(
                dataframe=dataframe,
                plan=plan.model_dump(),
            )
            insight = generate_insight(
                question=analysis.question,
                result=result,
            )
            visualization = generate_visualization(result=result)

            analysis.status = "completed"
            analysis.plan = plan.model_dump()
            analysis.result = result
            analysis.insight = insight
            analysis.visualization = (
                visualization.model_dump() if visualization else None
            )
            analysis.error = None
            analysis.updated_at = _utc_now()
            db.commit()
            logger.info("Analysis %s completed", analysis_id)

        except Exception:
            db.rollback()
            logger.exception("Analysis %s failed", analysis_id)

            failed = db.query(Analysis).filter(
                Analysis.id == analysis_id
            ).first()

            if failed is not None:
                failed.status = "failed"
                failed.error = "Analysis processing failed. Please try again."
                failed.updated_at = _utc_now()
                db.commit()

def run_worker():
    logger.info("InsightAI analysis worker started")

    while True:
        try:
            _recover_stale_jobs()
            analysis_id = _claim_job()

            if analysis_id is not None:
                _process_job(analysis_id)
            else:
                time.sleep(POLL_INTERVAL_SECONDS)

        except KeyboardInterrupt:
            logger.info("InsightAI analysis worker stopped")
            break
        except Exception:
            logger.exception("Worker loop error")
            time.sleep(POLL_INTERVAL_SECONDS)

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )
    run_worker()
