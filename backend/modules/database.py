import sqlite3
import hashlib
import pandas as pd
import streamlit as st
from datetime import datetime

DB_PATH = "integrity.db"

def init_db():
    """Initialize the SQLite database with Users and Submissions tables."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Users Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL -- 'student' or 'teacher'
        )
    ''')
    
    # Submissions Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            title TEXT NOT NULL,
            content TEXT,
            metrics_json TEXT, -- JSON string of stats
            integrity_score INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(student_id) REFERENCES users(id)
        )
    ''')
    
    # Create Default Users if not exist
    try:
        # Student: student / 123
        c.execute("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)", 
                  ("student", hashlib.sha256("123".encode()).hexdigest(), "student"))
        # Teacher: teacher / 123
        c.execute("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)", 
                  ("teacher", hashlib.sha256("123".encode()).hexdigest(), "teacher"))
        conn.commit()
    except sqlite3.IntegrityError:
        pass # Users already exist
        
    conn.close()

def get_connection():
    """Return a DB connection."""
    return sqlite3.connect(DB_PATH, check_same_thread=False)

def login_user(username, password):
    """Verify credentials and return User object or None."""
    conn = get_connection()
    c = conn.cursor()
    pwd_hash = hashlib.sha256(password.encode()).hexdigest()
    
    c.execute("SELECT id, username, role FROM users WHERE username=? AND password_hash=?", (username, pwd_hash))
    user = c.fetchone()
    conn.close()
    return user # (id, username, role)

def submit_assignment(student_id, title, content, metrics, score):
    """Save a new assignment submission."""
    conn = get_connection()
    c = conn.cursor()
    import json
    metrics_str = json.dumps(metrics)
    c.execute("INSERT INTO submissions (student_id, title, content, metrics_json, integrity_score) VALUES (?, ?, ?, ?, ?)",
              (student_id, title, content, metrics_str, score))
    conn.commit()
    conn.close()

def get_all_submissions():
    """Fetch all submissions for the teacher dashboard."""
    conn = get_connection()
    df = pd.read_sql_query("SELECT s.id, u.username as Student, s.title, s.timestamp, s.integrity_score FROM submissions s JOIN users u ON s.student_id = u.id", conn)
    conn.close()
    return df

def get_submission_details(sub_id):
    """Fetch full details of a single submission."""
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT content, metrics_json FROM submissions WHERE id=?", (sub_id,))
    res = c.fetchone()
    conn.close()
    return res
