from datetime import datetime, timezone
from io import BytesIO

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.analysis import Analysis
from app.models.dataset import Dataset
from app.services.analysis_engine import execute_plan
from app.services.storage import download_dataset_file
from app.models.analysis_schema import AnalysisExecuteRequest

router = APIRouter(
    prefix="/analyses",
    tags=["Analyses"],
)


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
        # Download original dataset
        file_bytes = download_dataset_file(
            dataset.storage_path
        )

        # Parse dataset
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

        # Convert validated Pydantic model to dict
        plan = request.plan.model_dump()

        # Execute deterministic analysis
        result = execute_plan(
            dataframe=dataframe,
            plan=plan,
        )

        # Store analysis
        now = datetime.now(timezone.utc)

        analysis = Analysis(
            dataset_id=dataset.id,
            question=request.question,
            status="completed",
            plan=plan,
            result=result,
            insight=None,
            created_at=now,
            updated_at=now,
        )

        db.add(analysis)
        db.commit()
        db.refresh(analysis)

        return {
            "analysis_id": analysis.id,
            "dataset_id": dataset.id,
            "question": request.question,
            "status": analysis.status,
            "plan": plan,
            "result": result,
        }

    except HTTPException:
        raise

    except ValueError as error:
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