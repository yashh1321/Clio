from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import SessionLocal, Submission, init_db
import uvicorn

# Initialize Database
init_db()

app = FastAPI()

# Enable CORS (So the Frontend can talk to Backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow localhost:3000
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    student_id: str
    assignment_title: str
    content: str
    wpm: int
    paste_count: int

# --- API Endpoints ---

@app.post("/submit")
def submit_essay(data: SubmissionRequest, db: Session = Depends(get_db)):
    # Validate WPM - reject negative or excessively high values
    if data.wpm < 0:
        raise HTTPException(status_code=400, detail="Invalid wpm: typing speed cannot be negative")
    if data.wpm > 300:
        raise HTTPException(status_code=400, detail="Invalid wpm: typing speed is unrealistically high")

    # Validate paste_count - reject negative values
    if data.paste_count < 0:
        raise HTTPException(status_code=400, detail="Invalid paste_count: paste count cannot be negative")

    # Calculate Score Logic
    score = 100
    score -= (data.paste_count * 15)
    if data.wpm > 100:
        score -= 20
    score = max(0, min(score, 100))

    # Save to DB
    new_submission = Submission(
        student_id=data.student_id,
        assignment_title=data.assignment_title,
        content=data.content,
        wpm=data.wpm,
        paste_count=data.paste_count,
        integrity_score=score
    )
    db.add(new_submission)
    db.commit()
    db.refresh(new_submission)
    return {"message": "Submitted Successfully", "score": score}

@app.get("/submissions")
def get_submissions(db: Session = Depends(get_db)):
    return db.query(Submission).all()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
