#!/usr/bin/env python3
import json
from google.auth.transport.requests import Request
from google.oauth2 import service_account
from googleapiclient.discovery import build
from datetime import datetime, date, timedelta, timezone

# Load credentials
with open('/Users/ryanrodenbeck/clawd/.credentials/google-calendar.json', 'r') as f:
    creds_info = json.load(f)

# Scopes required for calendar access
SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']

# Create credentials
credentials = service_account.Credentials.from_service_account_info(
    creds_info, scopes=SCOPES)

# Build the service
service = build('calendar', 'v3', credentials=credentials)

# Get today's date in Central time (UTC-6)
central_tz = timezone(timedelta(hours=-6))
today = date.today()
start_of_day = datetime.combine(today, datetime.min.time())
start_of_day = start_of_day.replace(tzinfo=central_tz)
end_of_day = start_of_day + timedelta(days=1)

# Convert to UTC for API
start_utc = start_of_day.astimezone(timezone.utc).isoformat()
end_utc = end_of_day.astimezone(timezone.utc).isoformat()

try:
    # Call the Calendar API
    events_result = service.events().list(
        calendarId='ryan@spyglassrealty.com',
        timeMin=start_utc,
        timeMax=end_utc,
        singleEvents=True,
        orderBy='startTime'
    ).execute()
    
    events = events_result.get('items', [])
    
    if not events:
        print('No events found for today.')
    else:
        print(f'Today\'s events ({len(events)} total):')
        for event in events:
            start = event['start'].get('dateTime', event['start'].get('date'))
            summary = event.get('summary', 'No title')
            
            # Parse datetime and convert to Central
            if 'T' in start:  # Has time
                start_dt = datetime.fromisoformat(start.replace('Z', '+00:00'))
                start_dt = start_dt.astimezone(central_tz)
                time_str = start_dt.strftime('%I:%M %p')
            else:  # All-day event
                time_str = 'All day'
            
            print(f'• {time_str}: {summary}')

except Exception as error:
    print(f'An error occurred: {error}')