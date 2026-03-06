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
    
    console.log(`Total messages in inbox: ${box.messages.total}`);
    
    // Get the most recent 10 messages
    const start = Math.max(1, box.messages.total - 9);
    const end = box.messages.total;
    
    if (box.messages.total === 0) {
      console.log('No messages found.');
      imap.end();
      return;
    }
    
    console.log(`Fetching messages ${start}:${end}`);
    
    const f = imap.fetch(`${start}:${end}`, { bodies: '' });
    
    f.on('message', function(msg, seqno) {
      msg.on('body', function(stream, info) {
        simpleParser(stream, (err, parsed) => {
          if (err) {
            console.log('Parse error:', err);
            return;
          }
          
          console.log(`\n--- Message ${seqno} ---`);
          console.log(`From: ${parsed.from.text}`);
          console.log(`Subject: ${parsed.subject}`);
          console.log(`Date: ${parsed.date}`);
          
          // Check if it's recent (last 2 hours)
          const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
          if (parsed.date && new Date(parsed.date) > twoHoursAgo) {
            console.log('*** RECENT EMAIL ***');
            console.log(`Text preview: ${parsed.text?.substring(0, 500)}${parsed.text?.length > 500 ? '...' : ''}`);
            
            // Check if it's from Ryan
            if (parsed.from.text.includes('ryan@spyglassrealty.com') || 
                parsed.from.text.toLowerCase().includes('ryan') ||
                parsed.subject?.toLowerCase().includes('clawd')) {
              console.log('*** THIS IS FROM RYAN - NEEDS REPLY ***');
            }
          }
        });
      });
    });
    
    f.once('end', function() {
      console.log('\nDone fetching messages!');
      imap.end();
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