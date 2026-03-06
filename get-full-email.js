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
    
    // Get the most recent message (92)
    const f = imap.fetch('92:92', { bodies: '' });
    
    f.on('message', function(msg, seqno) {
      msg.on('body', function(stream, info) {
        simpleParser(stream, (err, parsed) => {
          if (err) throw err;
          console.log(`\n=== FULL EMAIL MESSAGE ===`);
          console.log(`From: ${parsed.from.text}`);
          console.log(`Subject: ${parsed.subject}`);
          console.log(`Date: ${parsed.date}`);
          console.log(`\n--- FULL TEXT ---`);
          console.log(parsed.text);
          console.log(`\n--- FULL HTML ---`);
          console.log(parsed.html);
          console.log(`=== END EMAIL ===`);
        });
      });
    });
    
    f.once('end', function() {
      imap.end();
    });
  });
});

imap.once('error', function(err) {
  console.log('IMAP Error:', err);
});

imap.connect();