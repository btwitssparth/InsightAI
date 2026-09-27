import os

from dotenv import load_dotenv

load_dotenv()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", FRONTEND_URL).split(",")
    if origin.strip()
]

if not CORS_ORIGINS:
    CORS_ORIGINS = ["http://localhost:5173"]
