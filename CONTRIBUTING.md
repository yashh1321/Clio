# Contributing to Clio

First off, thank you for considering contributing to Clio! It's people like you that make Clio an incredible platform for academic integrity.

## Table of Contents
1. [Welcome](#welcome)
2. [Code of Conduct](#code-of-conduct)
3. [How You Can Help](#how-you-can-help)
   - [Reporting Bugs](#reporting-bugs)
   - [Suggesting Enhancements](#suggesting-enhancements)
   - [Pull Requests](#pull-requests)
4. [Local Development Setup](#local-development-setup)
5. [Code Style & Standards](#code-style--standards)

---

## Welcome
We welcome contributions from everyone—whether you're fixing a typo, resolving a bug in the Next.js frontend, or optimizing Python backend endpoints. 

## Code of Conduct
This project and everyone participating in it is governed by the [Clio Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How You Can Help

### Reporting Bugs
Bugs are tracked as GitHub issues. When creating an issue, please:
- Use the **Bug Report** issue template.
- Explain the problem and include additional details to help maintainers reproduce the problem.
- Include screenshots or animated GIFs if it is a visual bug.

### Suggesting Enhancements
Enhancement suggestions are tracked as GitHub issues.
- Use the **Feature Request** issue template.
- Provide a clear and descriptive title.
- Provide a step-by-step description of the suggested enhancement.
- Explain why this enhancement would be useful to most users.

### Pull Requests
1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

---

## Local Development Setup

### Option 1: Docker (Recommended)
You can run the entire stack (Frontend + Backend) using Docker Compose:
```bash
docker-compose up --build
```
- Frontend will be available at `http://localhost:3000`
- Backend will be available at `http://localhost:8000`

### Option 2: Manual Setup
#### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```

#### Backend (Python/FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### Environment Variables
For the project to run correctly, you need to connect to a Supabase database. Create a `.env.local` inside the `/frontend` directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_secret_key
AUTH_SECRET=your_auth_secret_or_random_string
```

---

## Code Style & Standards
- **Frontend**: We use `eslint` and `prettier` standard rules for Next.js 15. Run `npm run lint` before committing.
- **Backend**: Python code should generally follow PEP 8 standards. 
- **Commits**: Try to follow Conventional Commits format (e.g., `feat: added grading feature`, `fix: corrected login routing`).

We can't wait to see what you build! Let's make academic integrity better, together.
