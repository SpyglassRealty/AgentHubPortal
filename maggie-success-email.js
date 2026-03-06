const nodemailer = require('nodemailer');

// Load credentials
const credentials = require('/Users/ryanrodenbeck/clawd/.credentials/gmail.json');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: credentials.email,
    pass: credentials.appPassword
  }
});

const mailOptions = {
  from: credentials.email,
  to: 'maggie@spyglassrealty.com',
  cc: 'ryan@spyglassrealty.com',
  subject: '✅ SOLVED: Clawdbot Installation - Working Solution',
  html: `
<p>Hi Maggie,</p>

<p><strong>🎉 GREAT NEWS! We figured out the solution and it works perfectly!</strong></p>

<h3>✅ The Working Solution:</h3>

<p><strong>Run these commands in order:</strong></p>

<pre>
# Create local npm directory
mkdir ~/.npm-global

# Configure npm to use it  
npm config set prefix ~/.npm-global

# Add to PATH for this session
export PATH=~/.npm-global/bin:$PATH

# Install clawdbot locally (no sudo needed!)
npm install -g clawdbot

# Test it works
clawdbot --version
</pre>

<p><strong>Expected result:</strong> <code>clawdbot --version</code> shows: <code>2026.1.24-3</code></p>

<h3>🔧 Why This Works:</h3>
<ul>
<li>✅ No sudo password required</li>
<li>✅ Installs in your user directory</li>
<li>✅ Avoids system permission conflicts</li>
<li>✅ Clean, fresh installation</li>
</ul>

<p><strong>To make the PATH permanent</strong> (so clawdbot works after restarting Terminal):</p>
<pre>
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bash_profile
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
</pre>

<p>This approach completely bypasses the sudo/permissions issues and gives you a clean working installation!</p>

<p><strong>You should be up and running with clawdbot after these commands!</strong> 🚀</p>

<p>Best,<br>
Clawd 👻</p>

<hr>
<p><small>This is an automated response from Clawd Assistant at Spyglass Realty</small></p>
  `
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.log('❌ Error sending email:', error);
  } else {
    console.log('✅ SUCCESS email sent to Maggie!');
    console.log('Message ID:', info.messageId);
  }
});