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
  imap.openBox('INBOX', false, cb); // false = not read-only
}

imap.once('ready', function() {
  openInbox(function(err, box) {
    if (err) throw err;
    
    console.log(`Checking for unread emails...`);
    
    // Search for unread emails
    imap.search(['UNSEEN'], function(err, results) {
      if (err) throw err;
      
      if (results.length === 0) {
        console.log('No unread emails found.');
        
        // Also check for emails from ryan@spyglassrealty.com specifically
        imap.search(['FROM', 'ryan@spyglassrealty.com'], function(err, ryanResults) {
          if (err) throw err;
          
          if (ryanResults.length > 0) {
            console.log(`Found ${ryanResults.length} emails from ryan@spyglassrealty.com`);
            
            // Get the most recent one
            const f = imap.fetch([ryanResults[ryanResults.length - 1]], { bodies: '' });
            
            f.on('message', function(msg, seqno) {
              msg.on('body', function(stream, info) {
                simpleParser(stream, (err, parsed) => {
                  if (err) throw err;
                  console.log(`\n--- Most Recent Email from Ryan ---`);
                  console.log(`Subject: ${parsed.subject}`);
                  console.log(`Date: ${parsed.date}`);
                  console.log(`Text: ${parsed.text}`);
                });
              });
            });
            
            f.once('end', function() {
              imap.end();
            });
          } else {
            console.log('No emails found from ryan@spyglassrealty.com');
            imap.end();
          }
        });
        return;
      }
      
      console.log(`Found ${results.length} unread email(s):`);
      
      const f = imap.fetch(results, { bodies: '' });
      
      f.on('message', function(msg, seqno) {
        msg.on('body', function(stream, info) {
          simpleParser(stream, (err, parsed) => {
            if (err) throw err;
            console.log(`\n--- Unread Email ---`);
            console.log(`From: ${parsed.from.text}`);
            console.log(`Subject: ${parsed.subject}`);
            console.log(`Date: ${parsed.date}`);
            console.log(`Text: ${parsed.text}`);
          });
        });
      });
      
      f.once('end', function() {
        console.log('\nDone!');
        imap.end();
      });
    });
  });
});

imap.once('error', function(err) {
  console.log('IMAP Error:', err);
});

imap.connect();