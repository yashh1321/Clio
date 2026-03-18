import os
from fastapi import FastAPI, Depends, HTTPException, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import bleach
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.requests import Request
from starlette.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware
from database import SessionLocal, Submission, init_db
import uvicorn

# Initialize Database
init_db()

app = FastAPI()

# ── Rate Limiter ────────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Security Headers & Payload Size Middleware ─────────────────────────────────
MAX_PAYLOAD_SIZE = 20 * 1024 * 1024 # 20MB

class SecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Enforce size limit via Content-Length if present
        if "content-length" in request.headers:
            if int(request.headers["content-length"]) > MAX_PAYLOAD_SIZE:
                return Response(content="Payload Too Large", status_code=413)

        # Enforce size limit by streaming the body incrementally to prevent memory exhaustion
        body_bytes = b""
        async for chunk in request.stream():
            body_bytes += chunk
            if len(body_bytes) > MAX_PAYLOAD_SIZE:
                return Response(content="Payload Too Large", status_code=413)
        
        # Reassemble the chunks into body_bytes and cache it so downstream handlers can call request.body()
        request._body = body_bytes

        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app.add_middleware(SecurityMiddleware)

# ── API Key Authentication ──────────────────────────────────────────────────────
# Set CLIO_API_KEY env var in production. Falls back to a dev-only default.
API_KEY = os.environ.get("CLIO_API_KEY", "clio-dev-key-DO-NOT-USE-IN-PROD")
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def verify_api_key(key: str = Security(api_key_header)):
    if not key or key != API_KEY:
        raise HTTPException(status_code=401, detail="Missing or invalid API key")

# ── CORS — restricted to known frontend origin ─────────────────────────────────
ALLOWED_ORIGINS = os.environ.get(
    "CORS_ORIGINS", "http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-API-Key"],
)

# Dependency to get DB Session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Pydantic Models (Data Validation) ---
class SubmissionRequest(BaseModel):
    student_id: str = Field(..., min_length=1, max_length=100)
    assignment_title: str = Field(..., min_length=1, max_length=500)
    # Increased max_length to 20,000,000 characters to safely fit within MAX_PAYLOAD_SIZE (20MB) 
    # accounting for potential ~4 byte UTF-8 overhead and JSON wrapping.
    content: str = Field(..., min_length=1, max_length=20_000_000)
    wpm: int = Field(..., ge=0, le=300)
    paste_count: int = Field(..., ge=0)

# --- API Endpoints ---

@app.post("/submit")
@limiter.limit("10/minute")
def submit_essay(
    request: Request,
    data: SubmissionRequest,
    db: Session = Depends(get_db),
    _key: str = Depends(verify_api_key),
):

    # Calculate Score Logic
    score = 100
    score -= (data.paste_count * 15)
    if data.wpm > 100:
        score -= 20
    score = max(0, min(score, 100))

    # Sanitize HTML content to prevent XSS
    allowed_tags = [
        'a', 'abbr', 'acronym', 'b', 'blockquote', 'code',
        'em', 'i', 'li', 'ol', 'strong', 'ul',
        'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'span', 'div', 'u', 's'
    ]
    sanitized_content = bleach.clean(data.content, tags=allowed_tags, strip=True)

    # Save to DB
    new_submission = Submission(
        student_id=data.student_id,
        assignment_title=bleach.clean(data.assignment_title, tags=allowed_tags, strip=True),
        content=sanitized_content,
        wpm=data.wpm,
        paste_count=data.paste_count,
        integrity_score=score
    )
    db.add(new_submission)
    db.commit()
    db.refresh(new_submission)
    return {"message": "Submitted Successfully", "score": score}

@app.get("/submissions")
@limiter.limit("60/minute")
def get_submissions(
    request: Request,
    db: Session = Depends(get_db),
    _key: str = Depends(verify_api_key),
):
    return db.query(Submission).all()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
