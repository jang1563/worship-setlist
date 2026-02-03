from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.database import create_tables
from app.api.routes import songs, setlists, ai, trends, auth, playlists, favorites, chords, share, export, teams

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await create_tables()
    yield
    # Shutdown
    pass


app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered worship setlist generator for Korean churches",
    version="0.1.0",
    lifespan=lifespan
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix="/api")
app.include_router(songs.router, prefix="/api")
app.include_router(setlists.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(trends.router, prefix="/api")
app.include_router(playlists.router, prefix="/api")
app.include_router(favorites.router, prefix="/api")
app.include_router(chords.router, prefix="/api")
app.include_router(share.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(teams.router, prefix="/api")


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": "0.1.0",
        "message": "Welcome to WorshipFlow API"
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


# Global exception handler with proper logging
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import logging
    import traceback

    logger = logging.getLogger("worshipflow")
    error_trace = traceback.format_exc()

    # Log the full error for debugging
    logger.error(
        f"Unhandled exception on {request.method} {request.url.path}: "
        f"{type(exc).__name__}: {str(exc)}\n{error_trace}"
    )

    # Return safe error response
    if settings.DEBUG:
        # In development, include more details
        return JSONResponse(
            status_code=500,
            content={
                "detail": str(exc),
                "type": type(exc).__name__,
                "path": str(request.url.path)
            }
        )
    else:
        # In production, hide internal details
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error. Please try again later."}
        )
