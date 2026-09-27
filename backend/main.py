import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException

from database import engine
from app.api.analyses import router as analyses_router
from app.api.auth import router as auth_router
from app.api.datasets import router as datasets_router
from app.errors import (
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("insightai.api")

app = FastAPI(
    title="InsightAI API",
    description="AI-powered data analysis platform",
    version="0.1.0",
)

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

app.include_router(auth_router)
app.include_router(datasets_router)
app.include_router(analyses_router)

@app.get("/health")
def health_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception:
        logger.exception("Health check database connection failed")
        return {"status": "error", "database": "disconnected"}
