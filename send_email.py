import smtplib
from email.mime.text import MIMEText
import json

def send_email(subject, body, to_email, from_email):
    # Load email credentials from file
    try:
        with open('clawd-email-credentials.json', 'r') as f:
            credentials = json.load(f)
            email_user = credentials['email']
            email_password = credentials['app_password']
    except FileNotFoundError:
        print("Error: cl awd-email-credentials.json not found.")
        return False
    except json.JSONDecodeError:
        print("Error: Invalid JSON in clawd-email-credentials.json.")
        return False
    except KeyError:
        print("Error: Missing 'email' or 'password' key in clawd-email-credentials.json.")
        return False

    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = from_email
    msg['To'] = to_email

    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(email_user, email_password)
        server.sendmail(from_email, to_email, msg.as_string())
        server.quit()
        print("Email sent successfully!")
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Send an email.')
    parser.add_argument('-s', '--subject', type=str, required=True, help='The subject of the email.')
    parser.add_argument('-b', '--body', type=str, required=True, help='The body of the email.')
    parser.add_argument('-t', '--to_email', type=str, required=True, help='The recipient email address.')
    parser.add_argument('-f', '--from_email', type=str, required=True, help='The sender email address.')

    args = parser.parse_args()

    send_email(args.subject, args.body, args.to_email, args.from_email)