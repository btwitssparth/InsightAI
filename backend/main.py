from fastapi import FastAPI
from sqlalchemy import text

from database import engine
from app.api.analyses import router as analyses_router
from app.api.auth import router as auth_router
from app.api.datasets import router as datasets_router

app = FastAPI(
    title="InsightAI API",
    description="AI-powered data analysis platform",
    version="0.1.0",
)

app.include_router(auth_router)
app.include_router(datasets_router)
app.include_router(analyses_router)

@app.get("/health")
def health_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as error:
        return {"status": "error", "database": "disconnected", "detail": str(error)}
