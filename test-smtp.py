#!/usr/bin/env python3
import smtplib

email = "clawd@spyglassrealty.com"
password = "swse uvpc cyfq jemh"

try:
    # Connect to Gmail SMTP
    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.starttls()
    
    print("Attempting login...")
    server.login(email, password)
    print("✅ SUCCESS! Authentication worked.")
    server.quit()
    
except smtplib.SMTPAuthenticationError as e:
    print(f"❌ Authentication failed: {e}")
    print("\nPossible reasons:")
    print("1. App password is invalid or revoked")
    print("2. 2-step verification might not be enabled on the account")
    print("3. The password might need to be regenerated")
except Exception as e:
    print(f"❌ Error: {e}")