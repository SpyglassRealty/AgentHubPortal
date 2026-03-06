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
  imap.openBox('INBOX', false, cb);
}

imap.once('ready', function() {
  openInbox(function(err, box) {
    if (err) throw err;
    
    console.log(`Total messages in inbox: ${box.messages.total}`);
    
    // Check the last 15 messages for anything from Maggie
    const start = Math.max(1, box.messages.total - 14);
    const end = box.messages.total;
    
    if (box.messages.total === 0) {
      console.log('No messages found.');
      imap.end();
      return;
    }
    
    console.log(`Checking messages ${start}:${end} for Maggie...`);
    
    const f = imap.fetch(`${start}:${end}`, { bodies: '' });
    let foundMaggie = false;
    
    f.on('message', function(msg, seqno) {
      msg.on('body', function(stream, info) {
        simpleParser(stream, (err, parsed) => {
          if (err) {
            console.log('Parse error:', err);
            return;
          }
          
          const fromText = parsed.from?.text?.toLowerCase() || '';
          const fromAddress = parsed.from?.value?.[0]?.address?.toLowerCase() || '';
          
          if (fromText.includes('maggie') || fromAddress.includes('maggie')) {
            foundMaggie = true;
            console.log(`\n*** FOUND EMAIL FROM MAGGIE ***`);
            console.log(`Message ${seqno}`);
            console.log(`From: ${parsed.from.text}`);
            console.log(`Subject: ${parsed.subject}`);
            console.log(`Date: ${parsed.date}`);
            console.log(`Text: ${parsed.text}`);
            console.log('*** END MAGGIE EMAIL ***\n');
          }
          
          // Also show recent messages for context
          const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
          if (parsed.date && new Date(parsed.date) > oneHourAgo) {
            console.log(`Recent message ${seqno}: ${parsed.from.text} - ${parsed.subject} (${parsed.date})`);
          }
        });
      });
    });
    
    f.once('end', function() {
      if (!foundMaggie) {
        console.log('No emails found from Maggie in recent messages.');
      }
      console.log('Done checking for Maggie!');
      imap.end();
    });
  });
});

imap.once('error', function(err) {
  console.log('IMAP Error:', err);
});

imap.connect();