#!/usr/bin/env python3
import smtplib
import socket
import sys

socket.setdefaulttimeout(15)

SMTP_USER = "clawd@spyglassrealty.com"
SMTP_PASS = "Spygla$$realty123!"

try:
    print("Connecting to smtp.gmail.com:587...")
    s = smtplib.SMTP('smtp.gmail.com', 587, timeout=15)
    print("Connected. EHLO...")
    s.ehlo()
    print("STARTTLS...")
    s.starttls()
    s.ehlo()
    print("Logging in...")
    s.login(SMTP_USER, SMTP_PASS)
    print("AUTH SUCCESS")
    s.quit()
except smtplib.SMTPAuthenticationError as e:
    print(f"AUTH ERROR: {e}")
except Exception as e:
    print(f"FAIL: {type(e).__name__}: {e}")
