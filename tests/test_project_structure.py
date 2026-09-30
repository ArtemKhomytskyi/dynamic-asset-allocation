"""Structural checks for the completed academic project repository."""

from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def test_main_project_folders_exist():
    """Verify that each required top-level project directory exists."""
    required_folders = ["data", "notebooks", "src", "outputs", "tests"]

    for folder_name in required_folders:
        folder = PROJECT_ROOT / folder_name
        assert folder.is_dir(), f"Required project folder is missing: {folder_name}"
