#!/usr/bin/env node

import { google } from 'googleapis';
import fs from 'fs';

// Load service account credentials
const credentials = JSON.parse(fs.readFileSync('/Users/ryanrodenbeck/clawd/.credentials/google-calendar.json', 'utf8'));

// Create JWT client
const jwtClient = new google.auth.JWT(
  credentials.client_email,
  null,
  credentials.private_key,
  ['https://www.googleapis.com/auth/calendar.readonly'],
  'ryan@spyglassrealty.com' // Subject for domain-wide delegation
);

// Initialize Calendar API
const calendar = google.calendar({ version: 'v3', auth: jwtClient });

async function getTodaysEvents() {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const response = await calendar.events.list({
      calendarId: 'ryan@spyglassrealty.com',
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items;
    
    if (events.length === 0) {
      console.log('No events scheduled for today');
      return;
    }

    console.log('Today\'s Events:');
    events.forEach(event => {
      const start = event.start.dateTime || event.start.date;
      const time = event.start.dateTime ? 
        new Date(start).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          timeZone: 'America/Chicago'
        }) : 'All day';
      
      console.log(`• ${time} - ${event.summary}`);
      if (event.location) {
        console.log(`  📍 ${event.location}`);
      }
    });
    
  } catch (error) {
    console.error('Calendar API Error:', error.message);
    if (error.code === 403) {
      console.log('Domain-wide delegation may not be configured yet for this service account.');
    }
  }
}

getTodaysEvents();