from typing import Any

from fastapi import HTTPException, status

from app.services.supabase import supabase

def get_authenticated_user(access_token: str) -> dict[str, Any]:
    try:
        response = supabase.auth.get_user(access_token)
    except Exception as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired authentication token", headers={"WWW-Authenticate": "Bearer"}) from error

    user = getattr(response, "user", None)
    if user is None or not getattr(user, "id", None):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token", headers={"WWW-Authenticate": "Bearer"})

    return {"id": user.id, "email": getattr(user, "email", None), "role": getattr(user, "role", None)}
