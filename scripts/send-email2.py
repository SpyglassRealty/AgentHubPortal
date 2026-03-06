#!/usr/bin/env python3
import smtplib
import socket
import ssl
import sys

socket.setdefaulttimeout(10)

SMTP_USER = "clawd@spyglassrealty.com"
SMTP_PASS = "Spygla$$realty123!"

try:
    print("Connecting to smtp.gmail.com:465 (SSL)...", flush=True)
    context = ssl.create_default_context()
    s = smtplib.SMTP_SSL('smtp.gmail.com', 465, timeout=10, context=context)
    print("Connected. Logging in...", flush=True)
    s.login(SMTP_USER, SMTP_PASS)
    print("AUTH SUCCESS", flush=True)
    s.quit()
except smtplib.SMTPAuthenticationError as e:
    print(f"AUTH ERROR: {e}", flush=True)
except Exception as e:
    print(f"FAIL: {type(e).__name__}: {e}", flush=True)
