import os

from app.services.supabase import supabase


BUCKET_NAME = os.getenv(
    "SUPABASE_BUCKET",
    "insightai-datasets",
)


def upload_dataset_file(
    file_bytes: bytes,
    storage_path: str,
    content_type: str,
):
    response = (
        supabase.storage
        .from_(BUCKET_NAME)
        .upload(
            path=storage_path,
            file=file_bytes,
            file_options={
                "content-type": content_type,
                "upsert": "false",
            },
        )
    )

    return response
def download_dataset_file(storage_path: str) -> bytes:
    response = (
        supabase.storage
        .from_(BUCKET_NAME)
        .download(storage_path)
    )

    return response