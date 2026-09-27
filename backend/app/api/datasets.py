import logging
import os
import uuid
from datetime import datetime, timezone
from io import BytesIO

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models.analysis import Analysis
from app.models.dataset import Dataset
from app.services.profiler import profile_dataset
from app.services.storage import download_dataset_file, upload_dataset_file
from app.services.supabase import supabase

router = APIRouter(prefix="/datasets", tags=["Datasets"])
logger = logging.getLogger("insightai.datasets")

BUCKET_NAME = os.getenv("SUPABASE_BUCKET", "insightai-datasets")
MAX_FILE_SIZE = 10 * 1024 * 1024


def _get_owned_dataset(dataset_id: int, user_id: str, db: Session) -> Dataset:
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.owner_id == user_id,
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    original_filename = file.filename
    file_name = original_filename.lower()

    if not file_name.endswith((".csv", ".xlsx")):
        raise HTTPException(
            status_code=400,
            detail="Only CSV and XLSX files are supported",
        )

    storage_path = None

    try:
        contents = await file.read()

        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="File size exceeds the 10 MB upload limit",
            )

        dataset_uuid = str(uuid.uuid4())
        extension = original_filename.rsplit(".", 1)[-1].lower()
        storage_path = (
            f"datasets/{current_user['id']}/{dataset_uuid}/original.{extension}"
        )

        content_type = (
            "text/csv"
            if extension == "csv"
            else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

        if extension == "csv":
            dataframe = pd.read_csv(BytesIO(contents))
        else:
            dataframe = pd.read_excel(BytesIO(contents))

        profile = profile_dataset(dataframe)

        upload_dataset_file(
            file_bytes=contents,
            storage_path=storage_path,
            content_type=content_type,
        )

        now = datetime.now(timezone.utc)
        dataset = Dataset(
            owner_id=current_user["id"],
            name=original_filename.rsplit(".", 1)[0],
            file_name=original_filename,
            file_type=extension,
            storage_path=storage_path,
            file_size=len(contents),
            row_count=len(dataframe),
            column_count=len(dataframe.columns),
            status="ready",
            created_at=now,
            updated_at=now,
        )

        db.add(dataset)
        db.commit()
        db.refresh(dataset)

        return {
            "id": dataset.id,
            "name": dataset.name,
            "file_name": dataset.file_name,
            "file_type": dataset.file_type,
            "storage_path": dataset.storage_path,
            "file_size": dataset.file_size,
            "row_count": dataset.row_count,
            "column_count": dataset.column_count,
            "status": dataset.status,
            "profile": profile,
        }

    except HTTPException:
        raise
    except Exception:
        db.rollback()
        if storage_path:
            try:
                supabase.storage.from_(BUCKET_NAME).remove([storage_path])
            except Exception:
                logger.exception("Failed to clean up storage object %s", storage_path)
        logger.exception(
            "Dataset upload failed for user %s",
            current_user["id"],
        )
        raise HTTPException(
            status_code=500,
            detail="Could not process dataset. Please check the file and try again.",
        )


@router.get("/")
def get_datasets(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    datasets = (
        db.query(Dataset)
        .filter(Dataset.owner_id == current_user["id"])
        .order_by(Dataset.created_at.desc())
        .all()
    )

    return [
        {
            "id": dataset.id,
            "name": dataset.name,
            "file_name": dataset.file_name,
            "file_type": dataset.file_type,
            "file_size": dataset.file_size,
            "row_count": dataset.row_count,
            "column_count": dataset.column_count,
            "status": dataset.status,
            "created_at": dataset.created_at,
            "updated_at": dataset.updated_at,
        }
        for dataset in datasets
    ]


@router.get("/{dataset_id}")
def get_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    dataset = _get_owned_dataset(dataset_id, current_user["id"], db)
    return {
        "id": dataset.id,
        "name": dataset.name,
        "file_name": dataset.file_name,
        "file_type": dataset.file_type,
        "storage_path": dataset.storage_path,
        "file_size": dataset.file_size,
        "row_count": dataset.row_count,
        "column_count": dataset.column_count,
        "status": dataset.status,
        "created_at": dataset.created_at,
        "updated_at": dataset.updated_at,
    }


@router.get("/{dataset_id}/preview")
def preview_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    dataset = _get_owned_dataset(dataset_id, current_user["id"], db)

    try:
        file_bytes = download_dataset_file(dataset.storage_path)
        if dataset.file_type == "csv":
            dataframe = pd.read_csv(BytesIO(file_bytes))
        elif dataset.file_type == "xlsx":
            dataframe = pd.read_excel(BytesIO(file_bytes))
        else:
            raise HTTPException(status_code=400, detail="Unsupported dataset type")

        preview = dataframe.head(20).where(pd.notna(dataframe.head(20)), None)
        return {
            "dataset_id": dataset.id,
            "file_name": dataset.file_name,
            "columns": list(dataframe.columns),
            "rows": preview.to_dict(orient="records"),
            "total_rows": len(dataframe),
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("Could not preview dataset %s", dataset_id)
        raise HTTPException(
            status_code=500,
            detail="Could not preview dataset. Please try again.",
        )


@router.get("/{dataset_id}/profile")
def profile_dataset_endpoint(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    dataset = _get_owned_dataset(dataset_id, current_user["id"], db)

    try:
        file_bytes = download_dataset_file(dataset.storage_path)
        if dataset.file_type == "csv":
            dataframe = pd.read_csv(BytesIO(file_bytes))
        elif dataset.file_type == "xlsx":
            dataframe = pd.read_excel(BytesIO(file_bytes))
        else:
            raise HTTPException(status_code=400, detail="Unsupported dataset type")

        return {
            "dataset_id": dataset.id,
            "file_name": dataset.file_name,
            "profile": profile_dataset(dataframe),
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("Could not profile dataset %s", dataset_id)
        raise HTTPException(
            status_code=500,
            detail="Could not profile dataset. Please try again.",
        )


@router.get("/{dataset_id}/analyses")
def get_dataset_analyses(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    dataset = _get_owned_dataset(dataset_id, current_user["id"], db)

    analyses = (
        db.query(Analysis)
        .filter(Analysis.dataset_id == dataset.id)
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
            "error": analysis.error,
            "created_at": analysis.created_at,
            "updated_at": analysis.updated_at,
        }
        for analysis in analyses
    ]
