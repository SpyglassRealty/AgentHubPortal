import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import path from 'path';

const SMTP_USER = 'clawd@spyglassrealty.com';
const SMTP_PASS = 'uxry pdao hknh rjke';
const TO = process.argv[2] || 'ryan@spyglassrealty.com';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

// Read screenshots
const ssDir = '/Users/ryanrodenbeck/clawd/projects/email-screenshots';
const attachments = [
  { filename: 'mission-control-dashboard.jpg', path: path.join(ssDir, 'mission-control-dashboard.jpg'), cid: 'mission-control' },
  { filename: 'pulse-market-intelligence.jpg', path: path.join(ssDir, 'pulse-market-intelligence.jpg'), cid: 'pulse' },
  { filename: 'cma-builder.png', path: path.join(ssDir, 'cma-builder.png'), cid: 'cma' },
  { filename: 'idx-map-search.png', path: path.join(ssDir, 'idx-map-search.png'), cid: 'idx-search' },
  { filename: 'blog-page.jpg', path: path.join(ssDir, 'blog-page.jpg'), cid: 'blog' },
  { filename: 'spyglass-idx-homepage.jpg', path: path.join(ssDir, 'spyglass-idx-homepage.jpg'), cid: 'idx-home' },
];

const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 680px; margin: 0 auto; color: #1a1a1a; line-height: 1.6;">

<div style="text-align: center; padding: 40px 20px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 12px 12px 0 0;">
  <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 8px 0;">🔭 What You Missed at Spyglass</h1>
  <p style="color: #94a3b8; font-size: 16px; margin: 0;">Q1 2026 — New Office, New Tech, Big Moves</p>
</div>

<div style="padding: 32px 24px; background: #ffffff;">

<p style="font-size: 16px;">Hey team,</p>
<p style="font-size: 16px;">A lot has happened at Spyglass since the start of the year. If you haven't been paying close attention, here's everything you need to know — and trust me, you're going to want to read this one all the way through.</p>

<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">

<h2 style="color: #e74c3c; font-size: 22px;">🎤 RealtyHack Summit</h2>
<p>Ryan took the stage at the RealtyHack Summit to talk about how Spyglass is building the future of real estate tech — from AI-powered tools to agent-first platforms. If you missed it, <a href="https://youtu.be/rDas_0MBWxo" style="color: #e74c3c; font-weight: 600;">watch the full session here</a>. It's worth your time.</p>

<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">

<h2 style="color: #e74c3c; font-size: 22px;">🏢 New Home: Reunion Park, North Austin</h2>
<p>We moved into a brand new <strong>3,400 square foot office</strong> at Reunion Park in North Austin. The highlight? A <strong>50-person training room</strong> purpose-built for education, collaboration, and the kind of events that make Spyglass different from every other brokerage in town.</p>
<p><em>This isn't just an office. It's a launchpad.</em></p>

<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">

<h2 style="color: #e74c3c; font-size: 22px;">📈 Nearly 190 Agents &amp; Growing</h2>
<p>Spyglass has grown to nearly <strong>190 agents</strong> — and we're not slowing down. We're the <strong>#1 converting team at Zillow</strong> and the <strong>largest team by far</strong> in our market. That's not just a talking point — it's a direct result of the systems, support, and technology we're building for you.</p>

<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">

<h2 style="color: #e74c3c; font-size: 22px;">🚀 The Tech Stack — This Is Where It Gets Good</h2>
<p>We've been building. A lot. Here's what's live and what you can start using right now:</p>

<h3 style="font-size: 18px; color: #1a1a2e; margin-top: 28px;">Mission Control — Your New Command Center</h3>
<img src="cid:mission-control" alt="Mission Control Dashboard" style="width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; margin: 16px 0;">
<p>Mission Control is your personalized hub for everything Spyglass. When you log in, you'll see:</p>
<ul style="padding-left: 20px;">
  <li><strong>Your active listings</strong> with real-time MLS data</li>
  <li><strong>15 integrated apps</strong> — from CMA Builder to Contract Conduit to Home Review AI</li>
  <li><strong>Action items</strong> tailored to your business</li>
  <li><strong>Company updates and training</strong> in one place</li>
</ul>
<p>No more jumping between 10 different logins. Everything lives here.</p>

<h3 style="font-size: 18px; color: #1a1a2e; margin-top: 28px;">Pulse — Market Intelligence at Your Fingertips</h3>
<img src="cid:pulse" alt="Pulse Market Intelligence" style="width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; margin: 16px 0;">
<p>Pulse gives you access to <strong>50+ data layers</strong> across the entire Austin metro — updated in real time. You can:</p>
<ul style="padding-left: 20px;">
  <li>Search by <strong>zip code, city, county, or neighborhood</strong></li>
  <li>Track <strong>median sale prices, days on market, inventory levels</strong>, and more</li>
  <li>See <strong>6-month trend charts</strong> so you can speak confidently about where the market is heading</li>
  <li>Explore the <strong>Neighborhood Explorer</strong> with at-a-glance stats for every zip code</li>
</ul>
<p>This is the kind of data that used to take hours to pull together. Now it's one click.</p>
<p style="background: #f8fafc; padding: 12px 16px; border-radius: 8px; font-size: 14px; color: #475569;"><strong>Current snapshot:</strong> 14,993 active listings · $500K median · 30 avg days on market · $340/sqft</p>

<h3 style="font-size: 18px; color: #1a1a2e; margin-top: 28px;">CMA Builder — Professional Reports in Minutes</h3>
<img src="cid:cma" alt="CMA Builder" style="width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; margin: 16px 0;">
<p>Our in-house <strong>Comparative Market Analysis</strong> tool lets you create polished, branded CMAs for your clients — powered by the same MLS data feeding our entire platform. No third-party subscriptions needed.</p>

<h3 style="font-size: 18px; color: #1a1a2e; margin-top: 28px;">AI-Powered Home Search</h3>
<img src="cid:idx-search" alt="AI-Powered Home Search" style="width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; margin: 16px 0;">
<p>Our website now features an <strong>AI-powered search</strong> that lets buyers search the way they actually think — natural language queries like <em>"3 bed house in South Austin under $500K with a pool"</em> instead of clicking through filter dropdowns.</p>
<p>Plus: <strong>7,599 homes</strong> searchable with an interactive map, photo galleries, and neighborhood context.</p>

<h3 style="font-size: 18px; color: #1a1a2e; margin-top: 28px;">Spyglass Blog &amp; Content Engine</h3>
<img src="cid:blog" alt="Spyglass Blog" style="width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; margin: 16px 0;">
<p>We're publishing original market insights and neighborhood guides directly on our site. These aren't generic articles — they're data-driven pieces that position you as the expert when you share them with clients.</p>
<p><strong>Latest:</strong> "Austin Economic Forecast 2026" — housing trends, job growth, affordability analysis, and what to watch next.</p>

<h3 style="font-size: 18px; color: #1a1a2e; margin-top: 28px;">RealtyHack AI — Your Training Assistant</h3>
<p>Built right into Mission Control, <strong>RealtyHack AI</strong> gives you instant access to training answers, scripts, and coaching — powered by the same content from the RealtyHack Summit and our internal knowledge base.</p>

<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">

<h2 style="color: #e74c3c; font-size: 22px;">🔮 What's Coming Next</h2>
<p>We're not done. Here's what's in the pipeline:</p>
<ul style="padding-left: 20px;">
  <li><strong>Agent Performance Dashboards</strong> — see your numbers, track your goals, compare against the market</li>
  <li><strong>Recruiting Intelligence</strong> — smart alerts and pipeline management to help grow your team</li>
  <li><strong>More neighborhood content</strong> — interactive maps, community guides, and SEO pages driving leads to you</li>
  <li><strong>Mobile-first improvements</strong> — everything we build works on your phone</li>
</ul>

<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">

<h2 style="color: #e74c3c; font-size: 22px;">The Bottom Line</h2>
<p>Spyglass isn't just a brokerage. We're building a <strong>technology platform</strong> that makes you faster, smarter, and more competitive than agents at any other brokerage in Austin.</p>
<p style="font-size: 18px; font-weight: 600; color: #1a1a2e;">New office. New tools. Nearly 190 agents. #1 at Zillow. And we're just getting started.</p>
<p>Questions about any of this? Reply to this email or bring it up at the next huddle. We love showing this stuff off.</p>

<p style="margin-top: 32px;">— Ryan</p>

</div>

<div style="text-align: center; padding: 24px; background: #f8fafc; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
  <p style="margin: 0; color: #94a3b8; font-size: 13px;">Spyglass Realty · Austin, TX</p>
</div>

</div>
`;

console.log('Connecting to Gmail SMTP...');
try {
  await transporter.verify();
  console.log('SMTP verified. Sending...');
  
  const info = await transporter.sendMail({
    from: '"Spyglass Realty" <clawd@spyglassrealty.com>',
    to: TO,
    subject: "The Future of Real Estate Is Here. You're Already Using It.",
    html,
    attachments,
  });
  
  console.log('Email sent!', info.messageId);
} catch (err) {
  console.error('Failed:', err.message);
  if (err.response) console.error('SMTP response:', err.response);
}
