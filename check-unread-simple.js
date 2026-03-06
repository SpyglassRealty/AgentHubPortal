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

imap.once('ready', function() {
  imap.openBox('INBOX', false, function(err, box) {
    if (err) throw err;
    
    console.log(`Total messages: ${box.messages.total}, New: ${box.messages.new}, Unseen: ${box.messages.unseen}`);
    
    // Search for unread messages
    imap.search(['UNSEEN'], function(err, results) {
      if (err) throw err;
      
      if (results.length === 0) {
        console.log('No unread emails found.');
        imap.end();
        return;
      }
      
      console.log(`Found ${results.length} unread email(s):`);
      
      const f = imap.fetch(results, { bodies: '' });
      
      f.on('message', function(msg, seqno) {
        msg.on('body', function(stream, info) {
          simpleParser(stream, (err, parsed) => {
            if (err) throw err;
            console.log(`\n--- Unread Email ${seqno} ---`);
            console.log(`From: ${parsed.from.text}`);
            console.log(`Subject: ${parsed.subject}`);
            console.log(`Date: ${parsed.date}`);
            console.log(`Preview: ${parsed.text?.substring(0, 200)}...`);
            
            if (parsed.from.text.toLowerCase().includes('maggie')) {
              console.log('*** THIS IS FROM MAGGIE ***');
            }
          });
        });
      });
      
      f.once('end', function() {
        imap.end();
      });
    });
  });
});

imap.once('error', function(err) {
  console.log('IMAP Error:', err);
});

imap.connect();