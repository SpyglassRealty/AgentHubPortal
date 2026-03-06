const Imap = require('imap');
const { simpleParser } = require('mailparser');

// Load credentials
const credentials = require('/Users/ryanrodenbeck/clawd/.credentials/gmail.json');

const imap = new Imap({
  user: credentials.email,
  password: credentials.appPassword,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

function openInbox(cb) {
  imap.openBox('INBOX', true, cb);
}

imap.once('ready', function() {
  openInbox(function(err, box) {
    if (err) throw err;
    
    // Search for emails from the last day
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    imap.search(['SINCE', yesterday], function(err, results) {
      if (err) throw err;
      
      if (results.length === 0) {
        console.log('No recent emails found.');
        imap.end();
        return;
      }
      
      console.log(`Found ${results.length} recent email(s):`);
      
      // Get the most recent 5 emails
      const recentResults = results.slice(-5);
      
      const f = imap.fetch(recentResults, { bodies: '' });
      
      f.on('message', function(msg, seqno) {
        msg.on('body', function(stream, info) {
          simpleParser(stream, (err, parsed) => {
            if (err) throw err;
            console.log(`\n--- Recent Email ---`);
            console.log(`From: ${parsed.from.text}`);
            console.log(`Subject: ${parsed.subject}`);
            console.log(`Date: ${parsed.date}`);
            console.log(`Text: ${parsed.text?.substring(0, 300)}${parsed.text?.length > 300 ? '...' : ''}`);
            
            // Check if it's from Ryan
            if (parsed.from.text.includes('ryan@spyglassrealty.com') || 
                parsed.from.text.includes('Ryan') ||
                parsed.subject?.toLowerCase().includes('clawd')) {
              console.log('*** THIS APPEARS TO BE FROM RYAN ***');
            }
          });
        });
      });
      
      f.once('end', function() {
        console.log('\nDone fetching recent messages!');
        imap.end();
      });
    });
  });
});

imap.once('error', function(err) {
  console.log('IMAP Error:', err);
});

imap.once('end', function() {
  console.log('Connection ended');
});

imap.connect();