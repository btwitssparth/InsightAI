from datetime import datetime, timezone
from io import BytesIO

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.analysis import Analysis
from app.models.dataset import Dataset
from app.models.analysis_schema import (
    AnalysisExecuteRequest,
    AnalysisQuestionRequest,
)
from app.services.analysis_engine import execute_plan
from app.services.insight_generator import generate_insight
from app.services.planner import generate_analysis_plan
from app.services.profiler import profile_dataset
from app.services.storage import download_dataset_file
from app.services.visualization import generate_visualization


router = APIRouter(
    prefix="/analyses",
    tags=["Analyses"],
)


# ======================================================
# GET ALL ANALYSES
# ======================================================

@router.get("/")
def get_analyses(
    db: Session = Depends(get_db),
):
    analyses = (
        db.query(Analysis)
        .order_by(Analysis.created_at.desc())
        .all()
    )

    return [
        {
            "analysis_id": analysis.id,
            "dataset_id": analysis.dataset_id,
            "question": analysis.question,
            "status": analysis.status,
            "plan": analysis.plan,
            "result": analysis.result,
            "insight": analysis.insight,
            "visualization": analysis.visualization,
            "created_at": analysis.created_at,
            "updated_at": analysis.updated_at,
        }
        for analysis in analyses
    ]


# ======================================================
# GET SINGLE ANALYSIS
# ======================================================

@router.get("/{analysis_id}")
def get_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
):
    analysis = (
        db.query(Analysis)
        .filter(Analysis.id == analysis_id)
        .first()
    )

    if not analysis:
        raise HTTPException(
            status_code=404,
            detail="Analysis not found",
        )

    return {
        "analysis_id": analysis.id,
        "dataset_id": analysis.dataset_id,
        "question": analysis.question,
        "status": analysis.status,
        "plan": analysis.plan,
        "result": analysis.result,
        "insight": analysis.insight,
        "visualization": analysis.visualization,
        "created_at": analysis.created_at,
        "updated_at": analysis.updated_at,
    }


# ======================================================
# ASK NATURAL-LANGUAGE QUESTION
# ======================================================

@router.post("/ask")
def ask_analysis_question(
    request: AnalysisQuestionRequest,
    db: Session = Depends(get_db),
):
    dataset = (
        db.query(Dataset)
        .filter(Dataset.id == request.dataset_id)
        .first()
    )

    if not dataset:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found",
        )

    try:
        # --------------------------------------------------
        # Download dataset
        # --------------------------------------------------

        file_bytes = download_dataset_file(
            dataset.storage_path
        )

        # --------------------------------------------------
        # Parse dataset
        # --------------------------------------------------

        if dataset.file_type == "csv":
            dataframe = pd.read_csv(
                BytesIO(file_bytes)
            )

        elif dataset.file_type == "xlsx":
            dataframe = pd.read_excel(
                BytesIO(file_bytes)
            )

        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported dataset type",
            )

        # --------------------------------------------------
        # Generate dataset profile
        # --------------------------------------------------

        dataset_profile = profile_dataset(
            dataframe
        )

        # --------------------------------------------------
        # Generate AI analysis plan
        # --------------------------------------------------

        plan = generate_analysis_plan(
            question=request.question,
            dataset_profile=dataset_profile,
        )

        # --------------------------------------------------
        # Execute deterministic analysis
        # --------------------------------------------------

        result = execute_plan(
            dataframe=dataframe,
            plan=plan.model_dump(),
        )

        # --------------------------------------------------
        # Generate AI insight from verified result
        # --------------------------------------------------

        insight = generate_insight(
            question=request.question,
            result=result,
        )

        # --------------------------------------------------
        # Generate visualization
        # --------------------------------------------------

        visualization = generate_visualization(
            result=result,
        )

        # --------------------------------------------------
        # Store analysis
        # --------------------------------------------------

        now = datetime.now(timezone.utc)

        analysis = Analysis(
            dataset_id=dataset.id,
            question=request.question,
            status="completed",
            plan=plan.model_dump(),
            result=result,
            insight=insight,
            visualization=(
                visualization.model_dump()
                if visualization
                else None
            ),
            created_at=now,
            updated_at=now,
        )

        db.add(analysis)
        db.commit()
        db.refresh(analysis)

        # --------------------------------------------------
        # Return analysis
        # --------------------------------------------------

        return {
            "analysis_id": analysis.id,
            "dataset_id": dataset.id,
            "question": request.question,
            "status": analysis.status,
            "plan": plan.model_dump(),
            "result": result,
            "insight": insight,
            "visualization": (
                visualization.model_dump()
                if visualization
                else None
            ),
        }

    except HTTPException:
        raise

    except ValueError as error:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(error)}",
        )


# ======================================================
# EXECUTE MANUAL ANALYSIS PLAN
# ======================================================

@router.post("/execute")
def execute_analysis(
    request: AnalysisExecuteRequest,
    db: Session = Depends(get_db),
):
    dataset = (
        db.query(Dataset)
        .filter(Dataset.id == request.dataset_id)
        .first()
    )

    if not dataset:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found",
        )

    try:
        # --------------------------------------------------
        # Download original dataset
        # --------------------------------------------------

        file_bytes = download_dataset_file(
            dataset.storage_path
        )

        # --------------------------------------------------
        # Parse dataset
        # --------------------------------------------------

        if dataset.file_type == "csv":
            dataframe = pd.read_csv(
                BytesIO(file_bytes)
            )

        elif dataset.file_type == "xlsx":
            dataframe = pd.read_excel(
                BytesIO(file_bytes)
            )

        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported dataset type",
            )

        # --------------------------------------------------
        # Convert validated Pydantic model to dict
        # --------------------------------------------------

        plan = request.plan.model_dump()

        # --------------------------------------------------
        # Execute deterministic analysis
        # --------------------------------------------------

        result = execute_plan(
            dataframe=dataframe,
            plan=plan,
        )

        # --------------------------------------------------
        # Generate AI insight
        # --------------------------------------------------

        insight = generate_insight(
            question=request.question,
            result=result,
        )

        # --------------------------------------------------
        # Generate visualization
        # --------------------------------------------------

        visualization = generate_visualization(
            result=result,
        )

        # --------------------------------------------------
        # Store analysis
        # --------------------------------------------------

        now = datetime.now(timezone.utc)

        analysis = Analysis(
            dataset_id=dataset.id,
            question=request.question,
            status="completed",
            plan=plan,
            result=result,
            insight=insight,
            visualization=(
                visualization.model_dump()
                if visualization
                else None
            ),
            created_at=now,
            updated_at=now,
        )

        db.add(analysis)
        db.commit()
        db.refresh(analysis)

        # --------------------------------------------------
        # Return analysis
        # --------------------------------------------------

        return {
            "analysis_id": analysis.id,
            "dataset_id": dataset.id,
            "question": request.question,
            "status": analysis.status,
            "plan": plan,
            "result": result,
            "insight": insight,
            "visualization": (
                visualization.model_dump()
                if visualization
                else None
            ),
        }

    except HTTPException:
        raise

    except ValueError as error:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(error)}",
        )