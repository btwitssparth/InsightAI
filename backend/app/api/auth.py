from typing import Any

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.get("/me")
def get_me(current_user: dict[str, Any] = Depends(get_current_user)):
    return current_user
