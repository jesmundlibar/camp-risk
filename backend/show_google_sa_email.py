"""
Print client_email from a Google Cloud service account JSON key (for Sheet sharing).

Usage (PowerShell):
  cd backend
  python show_google_sa_email.py "C:\\Users\\acer\\Downloads\\your-project-xxxxx.json"

Or double-click won't work well — run from terminal and paste the path when asked.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path


def main() -> None:
    if len(sys.argv) >= 2:
        path = Path(sys.argv[1].strip().strip('"'))
    else:
        raw = input("Paste the full path to your service account .json file:\n> ").strip().strip('"')
        path = Path(raw)
    if not path.is_file():
        print(f"Not found: {path}", file=sys.stderr)
        sys.exit(1)
    data = json.loads(path.read_text(encoding="utf-8"))
    email = data.get("client_email")
    pid = data.get("project_id")
    if not email:
        print("This file has no 'client_email' field — is it a Google service account key?", file=sys.stderr)
        sys.exit(1)
    print()
    print("Copy this line into Google Sheets → Share (as Editor):")
    print(email)
    if pid:
        print(f"\n(project_id in file: {pid})")
    print()


if __name__ == "__main__":
    main()
