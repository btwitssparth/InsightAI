from datetime import datetime, timezone
from io import BytesIO

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models.analysis import Analysis
from app.models.analysis_schema import AnalysisExecuteRequest, AnalysisQuestionRequest
from app.models.dataset import Dataset
from app.services.analysis_engine import execute_plan, execute_workflow
from app.services.insight_generator import generate_insight
from app.services.json_utils import sanitize_for_json
from app.services.planner import generate_analysis_plan
from app.services.profiler import profile_dataset
from app.services.resource_limits import validate_dataframe_resources
from app.services.storage import download_dataset_file
from app.services.visualization import generate_visualization

router = APIRouter(prefix="/analyses", tags=["Analyses"])


def _get_owned_dataset(dataset_id: int, user_id: str, db: Session) -> Dataset:
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.owner_id == user_id,
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


def _get_owned_analysis(analysis_id: int, user_id: str, db: Session) -> Analysis:
    analysis = (
        db.query(Analysis)
        .join(Dataset, Analysis.dataset_id == Dataset.id)
        .filter(Analysis.id == analysis_id, Dataset.owner_id == user_id)
        .first()
    )
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis


def _load_dataframe(dataset: Dataset) -> pd.DataFrame:
    file_bytes = download_dataset_file(dataset.storage_path)
    if dataset.file_type == "csv":
        dataframe = pd.read_csv(BytesIO(file_bytes))
    elif dataset.file_type == "xlsx":
        dataframe = pd.read_excel(BytesIO(file_bytes))
    else:
        raise HTTPException(status_code=400, detail="Unsupported dataset type")

    validate_dataframe_resources(dataframe)
    return dataframe


def _serialize_analysis(analysis: Analysis) -> dict:
    return sanitize_for_json({
        "analysis_id": analysis.id,
        "dataset_id": analysis.dataset_id,
        "question": analysis.question,
        "status": analysis.status,
        "plan": analysis.plan,
        "result": analysis.result,
        "insight": analysis.insight,
        "visualization": analysis.visualization,
        "error": analysis.error,
        "attempt_count": analysis.attempt_count,
        "created_at": analysis.created_at,
        "updated_at": analysis.updated_at,
    })


@router.get("/")
def get_analyses(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    analyses = (
        db.query(Analysis)
        .join(Dataset, Analysis.dataset_id == Dataset.id)
        .filter(Dataset.owner_id == current_user["id"])
        .order_by(Analysis.created_at.desc())
        .all()
    )
    return sanitize_for_json([_serialize_analysis(analysis) for analysis in analyses])


@router.get("/{analysis_id}")
def get_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return sanitize_for_json(_serialize_analysis(
        _get_owned_analysis(analysis_id, current_user["id"], db)
    ))


@router.post("/ask", status_code=status.HTTP_202_ACCEPTED)
def ask_analysis_question(
    request: AnalysisQuestionRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    dataset = _get_owned_dataset(request.dataset_id, current_user["id"], db)
    now = datetime.now(timezone.utc)

    analysis = Analysis(
        dataset_id=dataset.id,
        question=request.question,
        status="pending",
        created_at=now,
        updated_at=now,
    )

    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return sanitize_for_json(_serialize_analysis(analysis))


@router.post("/execute")
def execute_analysis(
    request: AnalysisExecuteRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    dataset = _get_owned_dataset(request.dataset_id, current_user["id"], db)

    try:
        dataframe = _load_dataframe(dataset)
        plan = request.plan.model_dump()
        result = execute_plan(dataframe=dataframe, plan=plan)
        insight = generate_insight(question=request.question, result=result)
        visualization = generate_visualization(result=result)

        now = datetime.now(timezone.utc)
        analysis = Analysis(
            dataset_id=dataset.id,
            question=request.question,
            status="completed",
            plan=plan,
            result=result,
            insight=insight,
            visualization=visualization.model_dump() if visualization else None,
            error=None,
            created_at=now,
            updated_at=now,
        )

        db.add(analysis)
        db.commit()
        db.refresh(analysis)
        return _serialize_analysis(analysis)

    except HTTPException:
        raise
    except ValueError as error:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(error))
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Analysis failed. Please try again.",
        )
