#!/usr/bin/env node

import { google } from 'googleapis';
import fs from 'fs';

try {
  // Load service account credentials
  const credentials = JSON.parse(fs.readFileSync('/Users/ryanrodenbeck/clawd/.credentials/google-calendar.json', 'utf8'));
  
  // Create JWT client
  const auth = new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key,
    ['https://www.googleapis.com/auth/calendar.readonly'],
    'ryan@spyglassrealty.com' // Subject for domain-wide delegation
  );

  // Initialize Calendar API
  const calendar = google.calendar({ version: 'v3', auth });

  // Get today's date range
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  console.log(`Checking calendar events for: ${startOfDay.toDateString()}`);

  // List events for today
  const response = await calendar.events.list({
    calendarId: 'ryan@spyglassrealty.com',
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = response.data.items || [];
  
  if (events.length === 0) {
    console.log('No events scheduled for today.');
  } else {
    console.log(`Found ${events.length} events today:`);
    events.forEach((event, index) => {
      const start = event.start?.dateTime || event.start?.date || 'No start time';
      const startTime = event.start?.dateTime ? new Date(event.start.dateTime).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      }) : 'All Day';
      
      console.log(`${index + 1}. ${startTime} - ${event.summary || 'No title'}`);
      if (event.description) {
        console.log(`   Description: ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}`);
      }
    });
  }

} catch (error) {
  console.log('Calendar access error (domain-wide delegation may not be set up yet):');
  console.log(error.message);
}