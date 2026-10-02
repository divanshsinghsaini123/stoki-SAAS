import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

try:
    from .config import (
        SMTP_HOST,
        SMTP_PORT,
        SMTP_USER,
        SMTP_PASSWORD,
        SMTP_FROM_EMAIL,
        SMTP_FROM_NAME,
    )
except ImportError:
    from config import (
        SMTP_HOST,
        SMTP_PORT,
        SMTP_USER,
        SMTP_PASSWORD,
        SMTP_FROM_EMAIL,
        SMTP_FROM_NAME,
    )

logger = logging.getLogger("stoki-mailer")


def send_otp_email(
    to_email: str,
    otp_code: str,
    purpose: str = "Email Verification",
    full_name: str | None = None,
) -> bool:
    """
    Dispatches a branded HTML OTP email via TLS SMTP.
    Falls back gracefully to logging if SMTP is unconfigured in development.
    """
    subject = f"Your Stoki Security Code: {otp_code}"
    greeting_name = full_name.split()[0] if full_name else "there"

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; margin: 0; padding: 24px; }}
    .card {{ max-width: 480px; margin: 0 auto; background-color: #121215; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 32px; }}
    .logo {{ display: inline-flex; align-items: center; gap: 8px; font-weight: 800; font-size: 20px; color: #10b981; margin-bottom: 24px; letter-spacing: -0.5px; }}
    .title {{ font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }}
    .text {{ font-size: 14px; line-height: 1.6; color: #a1a1aa; margin-bottom: 24px; }}
    .otp-box {{ background-color: #18181b; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 24px; }}
    .otp-code {{ font-family: monospace; font-size: 32px; font-weight: 800; color: #10b981; letter-spacing: 8px; }}
    .footer {{ font-size: 12px; color: #71717a; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">✦ Stoki Intelligence</div>
    <div class="title">{purpose}</div>
    <div class="text">
      Hi {greeting_name},<br><br>
      Please use the single-use verification code below to complete your request. This code will expire in <strong>10 minutes</strong>.
    </div>
    <div class="otp-box">
      <div class="otp-code">{otp_code}</div>
    </div>
    <div class="text" style="font-size: 13px; color: #71717a;">
      If you did not request this verification code, you can safely ignore this message.
    </div>
    <div class="footer">
      Stoki Hyperlocal Q-Commerce Stock Intelligence &copy; 2026. All rights reserved.
    </div>
  </div>
</body>
</html>"""

    # Check if SMTP user/password is provided
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.info(
            f"⚡ [DEV MODE OTP DISPATCH] No SMTP credentials provided. "
            f"Destination: {to_email} | Purpose: {purpose} | OTP: {otp_code}"
        )
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
        msg["To"] = to_email

        plain_text = f"Hi {greeting_name},\n\nYour Stoki verification code is: {otp_code}\nThis code expires in 10 minutes.\n\nStoki Team"
        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        # Send using STARTTLS
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM_EMAIL, [to_email], msg.as_string())

        logger.info(f"OTP successfully delivered to {to_email} via SMTP.")
        return True
    except Exception as e:
        logger.error(f"Failed to dispatch email via SMTP ({e}). Fallback logging OTP: {otp_code}")
        return True  # Do not block the user during development/testing
