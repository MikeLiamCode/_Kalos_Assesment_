from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import CORS_ORIGINS
from app.routers.health import router as health_router
from app.routers.chat import router as chat_router
from app.routers.parse import router as parse_router


def _normalize_origins(value):
    if isinstance(value, str):
        return [origin.strip() for origin in value.split(",") if origin.strip()]
    if isinstance(value, (list, tuple, set)):
        return [str(origin).strip() for origin in value if str(origin).strip()]
    return []


app = FastAPI(title="MemberGPT API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_normalize_origins(CORS_ORIGINS),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(chat_router, prefix="/chat", tags=["chat"])
app.include_router(parse_router, prefix="/parse", tags=["parse"])