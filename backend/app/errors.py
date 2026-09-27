from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.status import HTTP_500_INTERNAL_SERVER_ERROR

def api_error(code: str, message: str, status_code: int) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}},
    )

async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    code_by_status = {
        400: "BAD_REQUEST",
        401: "AUTHENTICATION_REQUIRED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        413: "PAYLOAD_TOO_LARGE",
        422: "VALIDATION_ERROR",
    }
    return api_error(
        code=code_by_status.get(exc.status_code, "HTTP_ERROR"),
        message=str(exc.detail),
        status_code=exc.status_code,
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return api_error(
        code="VALIDATION_ERROR",
        message="The request contains invalid or missing fields.",
        status_code=422,
    )

async def unhandled_exception_handler(request: Request, exc: Exception):
    return api_error(
        code="INTERNAL_SERVER_ERROR",
        message="An unexpected server error occurred. Please try again.",
        status_code=HTTP_500_INTERNAL_SERVER_ERROR,
    )
