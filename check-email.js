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
    
    // Search for recent unread emails
    imap.search(['UNSEEN'], function(err, results) {
      if (err) throw err;
      
      if (results.length === 0) {
        console.log('No new emails found.');
        imap.end();
        return;
      }
      
      console.log(`Found ${results.length} new email(s):`);
      
      const f = imap.fetch(results, { bodies: '' });
      
      f.on('message', function(msg, seqno) {
        let email = {};
        
        msg.on('body', function(stream, info) {
          simpleParser(stream, (err, parsed) => {
            if (err) throw err;
            console.log(`\n--- Email ${seqno} ---`);
            console.log(`From: ${parsed.from.text}`);
            console.log(`Subject: ${parsed.subject}`);
            console.log(`Date: ${parsed.date}`);
            console.log(`Text: ${parsed.text?.substring(0, 200)}${parsed.text?.length > 200 ? '...' : ''}`);
          });
        });
        
        msg.once('end', function() {
          console.log('Finished email ' + seqno);
        });
      });
      
      f.once('error', function(err) {
        console.log('Fetch error: ' + err);
      });
      
      f.once('end', function() {
        console.log('Done fetching all messages!');
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