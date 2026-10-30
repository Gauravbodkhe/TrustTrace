"""
Root convenience wrapper for TrustTrace SQLite -> Supabase PostgreSQL Data Migration.
"""
import sys
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from scripts.migrate_sqlite_to_postgres import migrate, main if "main" in dir() else None
import argparse

if __name__ == "__main__":
    from app.core.config import settings
    parser = argparse.ArgumentParser(description="Migrate TrustTrace SQLite database to PostgreSQL (Supabase)")
    parser.add_argument("--sqlite", default=os.path.join(ROOT_DIR, "trusttrace.db"), help="Path to source SQLite database file")
    parser.add_argument("--postgres", default=os.environ.get("DATABASE_URL") or settings.DATABASE_URL, help="Target PostgreSQL connection URL")
    args = parser.parse_args()

    if not args.postgres or "sqlite" in args.postgres:
        print("Error: Please provide a valid target PostgreSQL URL via --postgres or DATABASE_URL environment variable.")
        sys.exit(1)

    migrate(args.sqlite, args.postgres)
