"""Backend entry point - redirects to app.main for uvicorn."""

# This file exists for compatibility. The main app is in app/main.py
# Run with: uvicorn app.main:app --reload

from app.main import app

__all__ = ["app"]
