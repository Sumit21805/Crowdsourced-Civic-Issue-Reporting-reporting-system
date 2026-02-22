"""
Send email notification when an issue is reported.
Configure via environment variables or .env file.
"""

import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    # Load .env from the same directory as this file
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime


def send_issue_notification(
    reporter_email: str,
    subject: str,
    description: str,
    priority: str = "normal",
    category: str = "general",
) -> bool:
    """
    Send an email to the configured recipient when an issue is reported.

    Args:
        reporter_email: Email of the person reporting the issue
        subject: Issue subject/title
        description: Issue description/details
        priority: low, normal, high, critical
        category: Issue category (e.g., bug, feature, support)

    Returns:
        True if email was sent successfully, False otherwise.
    """
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    notify_email = os.getenv("NOTIFY_EMAIL", smtp_user)  # Who receives the alert

    if not smtp_user or not smtp_password:
        raise ValueError(
            "Set SMTP_USER and SMTP_PASSWORD in environment (or .env file)"
        )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[Issue Reported] {subject}"
    msg["From"] = smtp_user
    msg["To"] = notify_email

    reported_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    text_body = f"""
New issue reported

Reported by: {reporter_email}
Subject: {subject}
Category: {category}
Priority: {priority}
Time: {reported_at}

Description:
{description}
"""

    html_body = f"""
<html>
<body style="font-family: sans-serif; max-width: 600px;">
  <h2 style="color: #333;">New issue reported</h2>
  <table style="border-collapse: collapse; width: 100%;">
    <tr><td style="padding: 6px; border: 1px solid #ddd;"><strong>Reported by</strong></td><td style="padding: 6px; border: 1px solid #ddd;">{reporter_email}</td></tr>
    <tr><td style="padding: 6px; border: 1px solid #ddd;"><strong>Subject</strong></td><td style="padding: 6px; border: 1px solid #ddd;">{subject}</td></tr>
    <tr><td style="padding: 6px; border: 1px solid #ddd;"><strong>Category</strong></td><td style="padding: 6px; border: 1px solid #ddd;">{category}</td></tr>
    <tr><td style="padding: 6px; border: 1px solid #ddd;"><strong>Priority</strong></td><td style="padding: 6px; border: 1px solid #ddd;">{priority}</td></tr>
    <tr><td style="padding: 6px; border: 1px solid #ddd;"><strong>Time</strong></td><td style="padding: 6px; border: 1px solid #ddd;">{reported_at}</td></tr>
  </table>
  <h3>Description</h3>
  <pre style="background: #f5f5f5; padding: 12px; border-radius: 4px; white-space: pre-wrap;">{description}</pre>
</body>
</html>
"""

    msg.attach(MIMEText(text_body.strip(), "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        # Port 465 = SSL from the start (SMTP_SSL). Port 587 = plain then STARTTLS.
        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_host, smtp_port) as server:
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_user, notify_email, msg.as_string())
        else:
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_user, notify_email, msg.as_string())
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        raise  # re-raise so caller can log it


if __name__ == "__main__":
    # Example: run directly to test
    import sys

    ok = send_issue_notification(
        reporter_email=os.getenv("TEST_REPORTER", "user@example.com"),
        subject="Test issue from script",
        description="This is a test issue report.",
        priority="normal",
        category="test",
    )
    sys.exit(0 if ok else 1)
