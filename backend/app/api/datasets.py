import os
import uuid
from datetime import datetime, timezone
from io import BytesIO

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.dataset import Dataset
from app.services.profiler import profile_dataset
from app.services.storage import (
    upload_dataset_file,
    download_dataset_file,
)
from app.services.supabase import supabase


router = APIRouter(
    prefix="/datasets",
    tags=["Datasets"],
)


BUCKET_NAME = os.getenv(
    "SUPABASE_BUCKET",
    "insightai-datasets",
)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file provided",
        )

    original_filename = file.filename
    file_name = original_filename.lower()

    if not file_name.endswith((".csv", ".xlsx")):
        raise HTTPException(
            status_code=400,
            detail="Only CSV and XLSX files are supported",
        )

    try:
        # Read uploaded file
        contents = await file.read()

        # Enforce our current Supabase bucket limit
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail="File size exceeds the 10 MB upload limit",
            )

        # Generate a unique dataset ID for the storage path
        dataset_uuid = str(uuid.uuid4())

        extension = original_filename.rsplit(".", 1)[-1].lower()

        storage_path = (
            f"datasets/{dataset_uuid}/original.{extension}"
        )

        # Determine MIME type
        if extension == "csv":
            content_type = "text/csv"
        else:
            content_type = (
                "application/vnd.openxmlformats-officedocument."
                "spreadsheetml.sheet"
            )

        # Parse the dataset
        if extension == "csv":
            dataframe = pd.read_csv(BytesIO(contents))
        else:
            dataframe = pd.read_excel(BytesIO(contents))

        # Profile dataset
        profile = profile_dataset(dataframe)

        # Upload original file to Supabase Storage
        upload_dataset_file(
            file_bytes=contents,
            storage_path=storage_path,
            content_type=content_type,
        )

        # Create database record
        dataset = Dataset(
            name=original_filename.rsplit(".", 1)[0],
            file_name=original_filename,
            file_type=extension,
            storage_path=storage_path,
            file_size=len(contents),
            row_count=len(dataframe),
            column_count=len(dataframe.columns),
            status="ready",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
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

    except Exception as error:
        db.rollback()

        # Try to clean up the Storage object if the database operation failed
        try:
            supabase.storage.from_(BUCKET_NAME).remove(
                [storage_path]
            )
        except Exception:
            pass

        raise HTTPException(
            status_code=400,
            detail=f"Could not process dataset: {str(error)}",
        )

@router.get("/")
def get_datasets(
    db: Session = Depends(get_db),
):
    datasets = (
        db.query(Dataset)
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
):
    dataset = (
        db.query(Dataset)
        .filter(Dataset.id == dataset_id)
        .first()
    )

    if not dataset:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found",
        )

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
):
    dataset = (
        db.query(Dataset)
        .filter(Dataset.id == dataset_id)
        .first()
    )

    if not dataset:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found",
        )

    try:
        file_bytes = download_dataset_file(
            dataset.storage_path
        )

        if dataset.file_type == "csv":
            dataframe = pd.read_csv(BytesIO(file_bytes))
        elif dataset.file_type == "xlsx":
            dataframe = pd.read_excel(BytesIO(file_bytes))
        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported dataset type",
            )

        preview = dataframe.head(20).where(
            pd.notna(dataframe.head(20)),
            None,
        )

        return {
            "dataset_id": dataset.id,
            "file_name": dataset.file_name,
            "columns": list(dataframe.columns),
            "rows": preview.to_dict(orient="records"),
            "total_rows": len(dataframe),
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not preview dataset: {str(error)}",
        )
@router.get("/{dataset_id}/profile")
def profile_dataset_endpoint(
    dataset_id: int,
    db: Session = Depends(get_db),
):
    dataset = (
        db.query(Dataset)
        .filter(Dataset.id == dataset_id)
        .first()
    )

    if not dataset:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found",
        )

    try:
        # Download original file from Supabase Storage
        file_bytes = download_dataset_file(
            dataset.storage_path
        )

        # Parse file
        if dataset.file_type == "csv":
            dataframe = pd.read_csv(BytesIO(file_bytes))

        elif dataset.file_type == "xlsx":
            dataframe = pd.read_excel(BytesIO(file_bytes))

        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported dataset type",
            )

        # Generate profile
        profile = profile_dataset(dataframe)

        return {
            "dataset_id": dataset.id,
            "file_name": dataset.file_name,
            "profile": profile,
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not profile dataset: {str(error)}",
        )