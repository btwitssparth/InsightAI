import logging
import os
import time
from datetime import datetime, timedelta, timezone

from app.api.analyses import _load_dataframe
from app.models.analysis import Analysis
from app.models.dataset import Dataset
from app.services.analysis_engine import execute_workflow
from app.services.insight_generator import generate_insight
from app.services.planner import generate_analysis_plan
from app.services.profiler import profile_dataset
from app.services.visualization import generate_visualization
from database import SessionLocal

logger = logging.getLogger("insightai.worker")

POLL_INTERVAL_SECONDS = max(0.5, float(os.getenv("ANALYSIS_WORKER_POLL_INTERVAL", "2")))
JOB_TIMEOUT_SECONDS = max(60, int(os.getenv("ANALYSIS_JOB_TIMEOUT_SECONDS", "900")))
MAX_JOB_ATTEMPTS = max(1, int(os.getenv("ANALYSIS_MAX_ATTEMPTS", "3")))


def _utc_now():
    return datetime.now(timezone.utc)


def _recover_stale_jobs():
    cutoff = _utc_now() - timedelta(seconds=JOB_TIMEOUT_SECONDS)

    with SessionLocal() as db:
        jobs = (
            db.query(Analysis)
            .filter(
                Analysis.status == "processing",
                Analysis.updated_at < cutoff,
            )
            .all()
        )

        recovered = 0
        failed = 0

        for analysis in jobs:
            if analysis.attempt_count >= MAX_JOB_ATTEMPTS:
                analysis.status = "failed"
                analysis.error = (
                    "Analysis exceeded the maximum number of processing attempts."
                )
                failed += 1
            else:
                analysis.status = "pending"
                analysis.error = (
                    "Previous worker stopped before completing this analysis."
                )
                recovered += 1

            analysis.updated_at = _utc_now()

        if jobs:
            db.commit()

        if recovered or failed:
            logger.warning(
                "Recovered %s stale jobs and permanently failed %s jobs",
                recovered,
                failed,
            )


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
        analysis.attempt_count += 1
        analysis.error = None
        analysis.updated_at = _utc_now()

        analysis_id = analysis.id
        db.commit()

        logger.info(
            "Claimed analysis %s (attempt %s/%s)",
            analysis_id,
            analysis.attempt_count,
            MAX_JOB_ATTEMPTS,
        )

        return analysis_id


def _heartbeat(analysis_id: int):
    with SessionLocal() as db:
        analysis = db.query(Analysis).filter(
            Analysis.id == analysis_id,
            Analysis.status == "processing",
        ).first()

        if analysis is None:
            return False

        analysis.updated_at = _utc_now()
        db.commit()
        return True


def _process_job(analysis_id):
    with SessionLocal() as db:
        analysis = db.query(Analysis).filter(
            Analysis.id == analysis_id
        ).first()

        if analysis is None:
            logger.warning("Analysis %s disappeared before processing", analysis_id)
            return

        if analysis.status != "processing":
            logger.warning(
                "Analysis %s is no longer processing; skipping",
                analysis_id,
            )
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
            _heartbeat(analysis_id)

            dataset_profile = profile_dataset(dataframe)
            _heartbeat(analysis_id)

            plan = generate_analysis_plan(
                question=analysis.question,
                dataset_profile=dataset_profile,
            )
            _heartbeat(analysis_id)

            result = execute_workflow(
                dataframe=dataframe,
                workflow=plan.model_dump(),
            )
            _heartbeat(analysis_id)

            insight = generate_insight(
                question=analysis.question,
                result=result,
            )
            _heartbeat(analysis_id)

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

        except Exception as error:
            db.rollback()
            logger.exception("Analysis %s failed", analysis_id)

            error_text = str(error)

            is_quota_error = (
                "429" in error_text
                or "RESOURCE_EXHAUSTED" in error_text
                or "quota" in error_text.lower()
            )

            # Validation and execution ValueErrors are deterministic.
            # Retrying them would consume another Gemini request without
            # changing the underlying input or generated plan.
            is_deterministic_error = isinstance(error, ValueError)

            failed = db.query(Analysis).filter(
                Analysis.id == analysis_id,
                Analysis.status == "processing",
            ).first()

            if failed is not None:
                if is_quota_error:
                    failed.status = "failed"
                    failed.error = (
                        "AI analysis quota is currently exhausted. "
                        "Please try again after the provider quota resets."
                    )
                elif is_deterministic_error:
                    failed.status = "failed"
                    failed.error = error_text
                elif failed.attempt_count < MAX_JOB_ATTEMPTS:
                    failed.status = "pending"
                    failed.error = (
                        "Analysis processing failed and will be retried."
                    )
                else:
                    failed.status = "failed"
                    failed.error = (
                        "Analysis processing failed after multiple attempts. "
                        "Please try again."
                    )

                failed.updated_at = _utc_now()
                db.commit()


def run_worker():
    logger.info(
        "InsightAI analysis worker started "
        "(poll=%ss, timeout=%ss, max_attempts=%s)",
        POLL_INTERVAL_SECONDS,
        JOB_TIMEOUT_SECONDS,
        MAX_JOB_ATTEMPTS,
    )

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
