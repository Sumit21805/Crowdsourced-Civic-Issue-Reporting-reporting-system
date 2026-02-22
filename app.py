"""
Simple Flask API: POST /report-issue to report an issue and trigger email.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env: first from script dir, then from current working directory
_script_dir = Path(__file__).resolve().parent
_env_file = _script_dir / ".env"
load_dotenv(_env_file)
load_dotenv()  # fallback: cwd

from flask import Flask, request, jsonify
from send_issue_email import send_issue_notification

app = Flask(__name__)


def _check_smtp():
    """Print SMTP status at startup so you can see if .env was loaded."""
    user = os.getenv("SMTP_USER")
    has_pass = bool(os.getenv("SMTP_PASSWORD"))
    print(f"  .env path checked: {_env_file}")
    print(f"  SMTP_USER set: {bool(user)}  |  SMTP_PASSWORD set: {has_pass}")
    if not user or not has_pass:
        print("  --> Add SMTP_USER and SMTP_PASSWORD to a .env file in this folder and restart.")


@app.route("/report-issue", methods=["POST"])
def report_issue():
    """Accept issue report and send email notification."""
    data = request.get_json(force=True, silent=True) or {}
    reporter = data.get("reporter_email", "").strip()
    subject = data.get("subject", "").strip()
    description = data.get("description", "").strip()
    priority = data.get("priority", "normal")
    category = data.get("category", "general")

    if not reporter or not subject or not description:
        return (
            jsonify({
                "ok": False,
                "error": "reporter_email, subject, and description are required",
            }),
            400,
        )

    try:
        send_issue_notification(
            reporter_email=reporter,
            subject=subject,
            description=description,
            priority=priority,
            category=category,
        )
        return jsonify({"ok": True, "message": "Issue reported and email sent."})
    except ValueError as e:
        return jsonify({"ok": False, "error": str(e)}), 500
    except Exception as e:
        # Log the real error in the server console (where you ran python app.py)
        print(f"[report-issue] Email error: {e}")
        return jsonify({"ok": False, "error": "Failed to send notification"}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    print("Starting issue-email server...")
    _check_smtp()
    app.run(host="0.0.0.0", port=5000)
