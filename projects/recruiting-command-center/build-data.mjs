#!/usr/bin/env node
/**
 * Build script for Recruiting Command Center
 * Extracts data from Supabase MLS Grid tables and embeds it into the HTML dashboard.
 * Run: node build-data.mjs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env from recruiting-pipeline-next
function loadEnv() {
  const envPath = path.join(__dirname, '..', 'recruiting-pipeline-next', '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx);
      const val = trimmed.slice(eqIdx + 1);
      if (!process.env[key]) process.env[key] = val;
    }
  }
}
loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TARGET_OFFICES = ['Keller Williams', 'Compass', 'eXp Realty', 'RE/MAX', 'Realty Austin', 'Coldwell Banker', 'Berkshire Hathaway', 'Century 21', 'Douglas Elliman'];
const isTargetOffice = (office) => TARGET_OFFICES.some(t => office.toLowerCase().includes(t.toLowerCase()));

async function fetchAllTransactions() {
  console.log('📥 Fetching all transactions...');
  const allData = [];
  let offset = 0;
  const BATCH = 1000;
  while (true) {
    const { data, error } = await supabase.from('mls_transactions')
      .select('list_agent_full_name, list_office_name, buyer_agent_full_name, buyer_office_name, close_price, close_date, property_type, city')
      .neq('property_type', 'Residential Lease')
      .range(offset, offset + BATCH - 1);
    if (error) { console.error('Error:', error.message); break; }
    if (!data || data.length === 0) break;
    allData.push(...data);
    offset += BATCH;
    process.stdout.write(`  ${allData.length} records...\r`);
    if (data.length < BATCH) break;
  }
  console.log(`✅ Fetched ${allData.length} sales transactions`);
  return allData;
}

function processAgents(txns) {
  const agents = {};
  txns.forEach(t => {
    // Listing side
    if (t.list_agent_full_name && t.list_office_name) {
      const key = t.list_agent_full_name + '|' + t.list_office_name;
      if (!agents[key]) agents[key] = { name: t.list_agent_full_name, office: t.list_office_name, deals: 0, volume: 0, listSide: 0, buySide: 0, cities: {} };
      agents[key].deals++;
      agents[key].volume += (t.close_price || 0);
      agents[key].listSide++;
      agents[key].cities[t.city || 'Unknown'] = (agents[key].cities[t.city || 'Unknown'] || 0) + 1;
    }
    // Buyer side
    if (t.buyer_agent_full_name && t.buyer_office_name && t.buyer_agent_full_name !== 'Non Member') {
      const key = t.buyer_agent_full_name + '|' + t.buyer_office_name;
      if (!agents[key]) agents[key] = { name: t.buyer_agent_full_name, office: t.buyer_office_name, deals: 0, volume: 0, listSide: 0, buySide: 0, cities: {} };
      agents[key].deals++;
      agents[key].volume += (t.close_price || 0);
      agents[key].buySide++;
      agents[key].cities[t.city || 'Unknown'] = (agents[key].cities[t.city || 'Unknown'] || 0) + 1;
    }
  });

  // Calculate derived fields
  Object.values(agents).forEach(a => {
    a.avgPrice = a.deals > 0 ? Math.round(a.volume / a.deals) : 0;
    const topCity = Object.entries(a.cities).sort((x, y) => y[1] - x[1])[0];
    a.topCity = topCity ? topCity[0] : 'Unknown';
  });

  return agents;
}

function processOffices(agents) {
  const offices = {};
  Object.values(agents).forEach(a => {
    if (!offices[a.office]) offices[a.office] = { name: a.office, agents: 0, deals: 0, volume: 0 };
    offices[a.office].agents++;
    offices[a.office].deals += a.deals;
    offices[a.office].volume += a.volume;
  });
  return Object.values(offices).filter(o => o.deals >= 5);
}

function processSpyglass(txns) {
  const spyTxns = txns.filter(t =>
    (t.list_office_name && t.list_office_name.toLowerCase().includes('spyglass')) ||
    (t.buyer_office_name && t.buyer_office_name.toLowerCase().includes('spyglass'))
  );

  // Agent-level
  const agentMap = {};
  spyTxns.forEach(t => {
    let agent = null;
    let side = '';
    if (t.list_office_name?.toLowerCase().includes('spyglass')) { agent = t.list_agent_full_name; side = 'list'; }
    if (t.buyer_office_name?.toLowerCase().includes('spyglass')) { agent = t.buyer_agent_full_name; side = 'buy'; }
    if (!agent) return;
    if (!agentMap[agent]) agentMap[agent] = { name: agent, deals: 0, volume: 0, listSide: 0, buySide: 0, cities: {} };
    agentMap[agent].deals++;
    agentMap[agent].volume += (t.close_price || 0);
    if (side === 'list') agentMap[agent].listSide++;
    if (side === 'buy') agentMap[agent].buySide++;
    agentMap[agent].cities[t.city || 'Unknown'] = (agentMap[agent].cities[t.city || 'Unknown'] || 0) + 1;
  });

  Object.values(agentMap).forEach(a => {
    a.avgPrice = a.deals > 0 ? Math.round(a.volume / a.deals) : 0;
    const topCity = Object.entries(a.cities).sort((x, y) => y[1] - x[1])[0];
    a.topCity = topCity ? topCity[0] : 'Unknown';
  });

  // Monthly
  const monthly = {};
  spyTxns.forEach(t => {
    const mo = t.close_date?.slice(0, 7);
    if (!mo) return;
    if (!monthly[mo]) monthly[mo] = { count: 0, volume: 0 };
    monthly[mo].count++;
    monthly[mo].volume += (t.close_price || 0);
  });

  // Co-brokers
  const coBrokers = {};
  spyTxns.forEach(t => {
    let other = null;
    if (t.list_office_name?.toLowerCase().includes('spyglass') && t.buyer_office_name) other = t.buyer_office_name;
    if (t.buyer_office_name?.toLowerCase().includes('spyglass') && t.list_office_name) other = t.list_office_name;
    if (other && !other.toLowerCase().includes('spyglass')) {
      coBrokers[other] = (coBrokers[other] || 0) + 1;
    }
  });

  // Cities
  const cities = {};
  spyTxns.forEach(t => {
    if (t.city) cities[t.city] = (cities[t.city] || 0) + 1;
  });

  // Property types
  const types = {};
  spyTxns.forEach(t => {
    if (t.property_type) types[t.property_type] = (types[t.property_type] || 0) + 1;
  });

  return {
    agents: Object.values(agentMap).sort((a, b) => b.volume - a.volume),
    monthly,
    coBrokers,
    cities,
    types,
  };
}

function processMonthly(txns) {
  const monthly = {};
  txns.forEach(t => {
    const mo = t.close_date?.slice(0, 7);
    if (!mo) return;
    if (!monthly[mo]) monthly[mo] = { count: 0, volume: 0 };
    monthly[mo].count++;
    monthly[mo].volume += (t.close_price || 0);
  });
  return monthly;
}

async function main() {
  console.log('🔭 Recruiting Command Center — Data Builder');
  console.log('============================================\n');

  const txns = await fetchAllTransactions();
  
  console.log('\n📊 Processing agent data...');
  const agents = processAgents(txns);
  const agentList = Object.values(agents);
  console.log(`  ${agentList.length} unique agent profiles`);

  // Filter to recruiting targets (at target offices, 3+ deals, $1M+)
  const targets = agentList
    .filter(a => isTargetOffice(a.office) && a.deals >= 3 && a.volume >= 1000000)
    .sort((a, b) => b.volume - a.volume)
    .map(a => ({
      name: a.name,
      office: a.office,
      deals: a.deals,
      volume: a.volume,
      avgPrice: a.avgPrice,
      listSide: a.listSide,
      buySide: a.buySide,
      topCity: a.topCity,
      cities: a.cities,
    }));
  console.log(`  ${targets.length} recruiting targets`);

  console.log('\n🏢 Processing office data...');
  const offices = processOffices(agents);
  console.log(`  ${offices.length} offices with 5+ deals`);

  console.log('\n🔭 Processing Spyglass intel...');
  const spy = processSpyglass(txns);
  console.log(`  ${spy.agents.length} Spyglass agents`);

  console.log('\n📅 Processing monthly trends...');
  const monthly = processMonthly(txns);

  // Date range
  const dates = txns.map(t => t.close_date).filter(Boolean).sort();
  const dateRange = dates[0] + ' to ' + dates[dates.length - 1];

  const summary = {
    totalDeals: txns.length,
    totalVolume: txns.reduce((s, t) => s + (t.close_price || 0), 0),
    totalAgents: agentList.length,
    totalOffices: offices.length,
    dateRange,
    buildTime: new Date().toISOString(),
  };

  // Build the HTML
  console.log('\n📝 Embedding data into HTML...');
  let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

  html = html.replace('AGENT_DATA_PLACEHOLDER', JSON.stringify(targets));
  html = html.replace('OFFICE_DATA_PLACEHOLDER', JSON.stringify(offices));
  html = html.replace('SPYGLASS_DATA_PLACEHOLDER', JSON.stringify(spy.agents));
  html = html.replace('MONTHLY_DATA_PLACEHOLDER', JSON.stringify(monthly));
  html = html.replace('CO_BROKER_PLACEHOLDER', JSON.stringify(spy.coBrokers));
  html = html.replace('SPY_MONTHLY_PLACEHOLDER', JSON.stringify(spy.monthly));
  html = html.replace('SPY_CITIES_PLACEHOLDER', JSON.stringify(spy.cities));
  html = html.replace('SPY_TYPES_PLACEHOLDER', JSON.stringify(spy.types));
  html = html.replace('SUMMARY_PLACEHOLDER', JSON.stringify(summary));

  const outPath = path.join(__dirname, 'dashboard.html');
  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`✅ Dashboard built: ${outPath}`);
  console.log(`   ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB total`);

  console.log('\n📈 Summary:');
  console.log(`   Transactions: ${summary.totalDeals.toLocaleString()}`);
  console.log(`   Volume: $${(summary.totalVolume / 1e6).toFixed(1)}M`);
  console.log(`   Agents: ${summary.totalAgents.toLocaleString()}`);
  console.log(`   Recruiting targets: ${targets.length}`);
  console.log(`   Date range: ${dateRange}`);
  console.log(`   Spyglass agents: ${spy.agents.length}`);
}

main().catch(console.error);
