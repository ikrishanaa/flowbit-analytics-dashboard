import os
import sys
from pathlib import Path

import pytest


def import_main_with_env():
    # Ensure DB URL is set to an in-memory SQLite for testing
    os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
    # Add app/ to sys.path for import
    app_dir = Path(__file__).resolve().parents[1] / "app"
    sys.path.insert(0, str(app_dir))
    import importlib

    return importlib.import_module("main")


def test_app_loads_and_health_ok():
    main = import_main_with_env()
    # FastAPI app should exist
    assert hasattr(main, "app"), "FastAPI app not found in main.py"

    # Health endpoint should return ok: true
    from fastapi.testclient import TestClient

    client = TestClient(main.app)
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"ok": True }
