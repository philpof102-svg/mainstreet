#!/usr/bin/env node
/**
 * MainStreet CLI — query the reputation oracle from your terminal.
 *
 * Install:  npm i -g @raskhaaa/mainstreet-oracle
 * Run:      npx @raskhaaa/mainstreet-oracle 0x...
 *
 * Commands:
 *   mainstreet score 0x<addr>             — get score for an agent
 *   mainstreet compare 0x<a> 0x<b>        — head-to-head
 *   mainstreet leaderboard [N]            — top N (default 10)
 *   mainstreet search <query>             — search by description
 *   mainstreet recommend 0x<addr>         — similar agents
 *   mainstreet history 0x<addr>           — score time series
 *   mainstreet stats                      — live aggregate
 *   mainstreet movers                     — top gainers/losers
 *   mainstreet featured                   — Selection of the Week
 *   mainstreet me                         — proof of life
 *
 * Default command if you pass just an address: score.
 */
const ORIGIN = process.env.MAINSTREET_ORIGIN || 'https://avisradar-production.up.railway.app';

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const AMBER = '\x1b[33m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';

function color(score) {
  if (score == null) return DIM;
  if (score >= 40) return GREEN;
  if (score >= 20) return AMBER;
  return DIM;
}

function shortAddr(a) { return a ? a.slice(0, 6) + '…' + a.slice(-4) : '—'; }
function fmtJobs(n) { if (n == null) return '—'; if (n >= 1000) return (n/1000).toFixed(1) + 'k'; return String(n); }

async function api(path, opts) {
  const r = await fetch(ORIGIN + path, opts);
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${path}`);
  return r.json();
}

const commands = {
  async score(addr) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr || '')) throw new Error('usage: mainstreet score 0x<addr>');
    const d = await api('/api/agent/score/' + addr);
    const c = color(d.score);
    console.log(`${c}${BOLD}${d.score ?? '—'}/100${RESET} ${DIM}MainStreet score${RESET}`);
    console.log(`${BOLD}${d.description || '—'}${RESET}`);
    console.log(`${DIM}address:${RESET} ${BLUE}${addr}${RESET}`);
    console.log(`${DIM}services:${RESET} ${fmtJobs(d.metrics?.jobCount)}`);
    if (d.health) console.log(`${DIM}endpoint:${RESET} ${d.health.alive ? GREEN + 'alive' : '\x1b[31mdead'}${RESET} (last probe ${new Date(d.health.probedAt).toLocaleString()})`);
    if (d.resourcePath) console.log(`${DIM}serviceUrl:${RESET} ${d.resourcePath}`);
    if (d.price) console.log(`${DIM}price:${RESET} ${(Number(d.price.amount)/1e6).toFixed(4)} USDC on ${d.price.network}`);
    console.log(`${DIM}profile:${RESET} ${ORIGIN}/agent/${addr.toLowerCase()}`);
  },

  async leaderboard(n) {
    const limit = Number(n) || 10;
    const d = await api(`/api/agent/leaderboard?limit=${limit}`);
    console.log(`${BOLD}MainStreet leaderboard${RESET} ${DIM}(${d.count} of ${d.totalIndexed})${RESET}\n`);
    (d.results || []).forEach((r, i) => {
      const c = color(r.score);
      console.log(`${DIM}${String(i+1).padStart(3)}.${RESET} ${c}${String(r.score ?? '—').padStart(3)}/100${RESET}  ${shortAddr(r.payTo)}  ${(r.description||'—').slice(0, 60)}`);
    });
  },

  async compare(a, b) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(a||'') || !/^0x[a-fA-F0-9]{40}$/.test(b||'')) throw new Error('usage: mainstreet compare 0x<a> 0x<b>');
    const d = await api(`/api/agent/compare?a=${a}&b=${b}`);
    const winLabel = d.winner === 'a' ? `${GREEN}A wins${RESET}` : d.winner === 'b' ? `${GREEN}B wins${RESET}` : d.winner === 'tie' ? `${AMBER}TIE${RESET}` : `${DIM}no data${RESET}`;
    console.log(`${BOLD}${winLabel}${RESET} by ${d.margin || 0} pts\n${DIM}${d.recommendation}${RESET}\n`);
    ['a', 'b'].forEach((k) => {
      const x = d[k];
      if (!x.indexed) { console.log(`${BOLD}${k.toUpperCase()}${RESET}: ${DIM}not indexed${RESET}`); return; }
      const c = color(x.score);
      console.log(`${BOLD}${k.toUpperCase()}${RESET}: ${c}${x.score ?? '—'}/100${RESET}  ${shortAddr(x.address)}`);
      console.log(`     ${(x.description || '—').slice(0, 70)}`);
    });
  },

  async search(...words) {
    const q = words.join(' ');
    if (!q || q.length < 2) throw new Error('usage: mainstreet search <query>');
    const d = await api('/api/agent/search?q=' + encodeURIComponent(q) + '&limit=15');
    console.log(`${BOLD}"${q}"${RESET} ${DIM}→ ${d.count} match${d.count === 1 ? '' : 'es'}${RESET}\n`);
    (d.results || []).forEach((r, i) => {
      const c = color(r.score);
      console.log(`${DIM}${String(i+1).padStart(2)}.${RESET} ${c}${String(r.score ?? '—').padStart(3)}${RESET}  ${shortAddr(r.payTo)}  ${(r.description||'').slice(0, 70)}`);
    });
  },

  async recommend(addr, n) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr || '')) throw new Error('usage: mainstreet recommend 0x<addr>');
    const limit = Number(n) || 5;
    const d = await api(`/api/agent/recommend?for=${addr}&limit=${limit}`);
    console.log(`${BOLD}Similar to ${shortAddr(addr)}${RESET} ${DIM}(cat=${d.basis?.category || 'n/a'}, score=${d.basis?.score ?? 'n/a'})${RESET}\n`);
    (d.results || []).forEach((r, i) => {
      const c = color(r.score);
      const same = r.sameCategory ? GREEN + '·' + RESET : DIM + '·' + RESET;
      console.log(`${DIM}${i+1}.${RESET} ${c}${String(r.score ?? '—').padStart(3)}${RESET} ${same} ${shortAddr(r.payTo)}  ${(r.description||'').slice(0, 60)}`);
    });
  },

  async history(addr, days) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr || '')) throw new Error('usage: mainstreet history 0x<addr>');
    const d = await api(`/api/agent/history/${addr}?days=${Number(days) || 30}`);
    console.log(`${BOLD}${shortAddr(addr)}${RESET} ${DIM}${d.count} day${d.count === 1 ? '' : 's'} of history${RESET}\n`);
    (d.series || []).forEach((s) => {
      const c = color(s.score);
      console.log(`  ${s.date}  ${c}${String(s.score ?? '—').padStart(3)}/100${RESET}  ${DIM}jobs=${fmtJobs(s.jobCount)}${RESET}`);
    });
    if (d.note) console.log(`\n  ${DIM}${d.note}${RESET}`);
  },

  async stats() {
    const [me, lb, hs] = await Promise.all([api('/api/agent/me'), api('/api/agent/leaderboard?limit=1'), api('/api/agent/health-summary')]);
    console.log(`${BOLD}MainStreet — live stats${RESET}`);
    console.log(`  ${DIM}Indexed total:  ${RESET}${me.metrics?.bazaarIndexed || 0}`);
    console.log(`  ${DIM}Scored today:   ${RESET}${GREEN}${me.metrics?.scoredToday || 0}${RESET}`);
    console.log(`  ${DIM}Badges claimed: ${RESET}${me.metrics?.badgesClaimed || 0}`);
    if (hs.uptimePct != null) console.log(`  ${DIM}Uptime:         ${RESET}${hs.uptimePct}% ${DIM}(${hs.alive}/${hs.totalProbed})${RESET}`);
    if (lb.networkBreakdown) {
      console.log(`\n  ${DIM}Networks:${RESET}`);
      Object.entries(lb.networkBreakdown).sort((a,b)=>b[1]-a[1]).slice(0,6).forEach(([n,v]) => console.log(`    ${n.padEnd(36)} ${v}`));
    }
  },

  async movers(n) {
    const d = await api('/api/agent/movers?limit=' + (Number(n) || 5));
    console.log(`${BOLD}MainStreet — movers${RESET} ${DIM}${d.asOf?.slice(0, 10)}${RESET}\n`);
    if (d.note) { console.log(`${DIM}${d.note}${RESET}`); return; }
    console.log(`${BOLD}Gainers:${RESET}`);
    (d.gainers || []).forEach((m, i) => console.log(`  ${i+1}. ${GREEN}+${m.delta}${RESET}  ${m.scoreYesterday}→${m.scoreToday}  ${shortAddr(m.payTo)}  ${(m.description||'').slice(0,50)}`));
    console.log(`\n${BOLD}Losers:${RESET}`);
    (d.losers || []).forEach((m, i) => console.log(`  ${i+1}. \x1b[31m${m.delta}${RESET}  ${m.scoreYesterday}→${m.scoreToday}  ${shortAddr(m.payTo)}  ${(m.description||'').slice(0,50)}`));
  },

  async featured() {
    const d = await api('/api/agent/featured');
    console.log(`${BOLD}Selection of the Week${RESET}\n`);
    (d.picks || []).forEach((p) => {
      console.log(`${BOLD}${p.label}${RESET}  ${color(p.score)}${p.score ?? '—'}/100${RESET}`);
      console.log(`  ${(p.description||'').slice(0, 80)}`);
      console.log(`  ${DIM}${shortAddr(p.payTo)}${RESET}\n`);
    });
  },

  async me() {
    const d = await api('/api/agent/me');
    console.log(`${BOLD}${d.project}${RESET}  ${DIM}${d.pitch}${RESET}\n`);
    console.log(`  ${DIM}operator: ${RESET}${BLUE}${d.operator?.address}${RESET}`);
    console.log(`  ${DIM}token:    ${RESET}${BLUE}${d.token?.address}${RESET}  ${GREEN}(${d.token?.verified})${RESET}`);
    console.log(`  ${DIM}registry: ${RESET}${BLUE}${d.erc8004?.reputationRegistry}${RESET}`);
    console.log(`\n  ${DIM}indexed:${RESET} ${d.metrics?.bazaarIndexed}  ${DIM}scored:${RESET} ${d.metrics?.scoredToday}  ${DIM}badges:${RESET} ${d.metrics?.badgesClaimed}`);
  },

  async tags(n) {
    const d = await api('/api/agent/tags');
    const limit = Number(n) || 20;
    console.log(`${BOLD}Top ${limit} tags${RESET} ${DIM}(of ${d.count})${RESET}\n`);
    (d.tags || []).slice(0, limit).forEach((t, i) => {
      console.log(`${DIM}${String(i+1).padStart(2)}.${RESET} ${BOLD}${t.tag}${RESET} ${DIM}× ${t.count}${RESET}`);
    });
  },

  async tagged(tag, n) {
    if (!tag) throw new Error('usage: mainstreet tagged <tag> [limit]');
    const limit = Number(n) || 10;
    const d = await api(`/api/agent/tags/${encodeURIComponent(tag)}?limit=${limit}`);
    console.log(`${BOLD}Agents tagged "${d.tag}"${RESET} ${DIM}(${d.count} of total)${RESET}\n`);
    (d.results || []).forEach((r, i) => {
      const c = color(r.score);
      console.log(`${DIM}${String(i+1).padStart(2)}.${RESET} ${c}${String(r.score ?? '—').padStart(3)}${RESET}  ${shortAddr(r.payTo)}  ${(r.description||'').slice(0, 60)}`);
    });
  },

  async match(...words) {
    // Parse intent + flags. Mark indices to skip (flag name + its value).
    const skip = new Set();
    const opts = {};
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (w === '--limit') { opts.limit = Number(words[i+1]); skip.add(i); skip.add(i+1); }
      else if (w === '--min') { opts.minScore = Number(words[i+1]); skip.add(i); skip.add(i+1); }
      else if (w === '--max') { opts.maxPrice = words[i+1]; skip.add(i); skip.add(i+1); }
    }
    opts.intent = words.filter((_, i) => !skip.has(i)).join(' ');
    if (!opts.intent || opts.intent.length < 3) throw new Error('usage: mainstreet match <intent...> [--limit 3] [--min 20] [--max 0.05]');
    const d = await api('/api/agent/match', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(opts) });
    console.log(`${BOLD}Match "${opts.intent}"${RESET} ${DIM}(${d.count} result${d.count === 1 ? '' : 's'})${RESET}\n`);
    if (d.noStrongMatch) console.log(`${DIM}⚠  ${d.note}${RESET}\n`);
    (d.matches || []).forEach((m, i) => {
      const c = color(m.score);
      const price = m.price ? `${m.price.amountUsdc.toFixed(4)} USDC` : 'free';
      console.log(`${DIM}${i+1}.${RESET} ${c}${String(m.score ?? '—').padStart(3)}${RESET} match:${m.matchScore.toFixed(1)}  ${shortAddr(m.payTo)}  ${BLUE}${price}${RESET}`);
      console.log(`   ${DIM}${(m.description||'').slice(0, 70)}${RESET}`);
      if (m.serviceUrl) console.log(`   ${DIM}→${RESET} ${m.serviceUrl}`);
      const extras = [];
      if (m.settlements) extras.push(`${m.settlements.count} settle / $${m.settlements.volumeUsdc.toFixed(2)}`);
      if (m.sla) extras.push(`p50:${m.sla.latencyP50ms ?? '—'}ms ok:${Math.round((m.sla.okRate ?? 0)*100)}%`);
      if (extras.length) console.log(`   ${DIM}${extras.join(' · ')}${RESET}`);
    });
  },

  async pick(...words) {
    // Like match, but returns 1 result formatted for piping into a buyer agent.
    const skip = new Set();
    const opts = {};
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (w === '--min') { opts.minScore = Number(words[i+1]); skip.add(i); skip.add(i+1); }
      else if (w === '--max') { opts.maxPrice = words[i+1]; skip.add(i); skip.add(i+1); }
    }
    opts.intent = words.filter((_, i) => !skip.has(i)).join(' ');
    opts.limit = 1;
    if (!opts.intent || opts.intent.length < 3) throw new Error('usage: mainstreet pick <intent...> [--min S] [--max P]');
    const d = await api('/api/agent/match', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(opts) });
    const m = d.matches?.[0];
    if (!m) { console.error(`no match for "${opts.intent}"`); process.exit(1); }
    if (d.noStrongMatch) console.error(`⚠  weak match: ${d.note}`);
    console.log(JSON.stringify({ payTo: m.payTo, serviceUrl: m.serviceUrl, price: m.price, score: m.score, sla: m.sla, settlements: m.settlements }, null, 2));
  },

  async receipts(addr) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr || '')) throw new Error('usage: mainstreet receipts 0x<addr>');
    const d = await api('/api/agent/receipts?for=' + addr);
    if (d.summary) {
      console.log(`${BOLD}${shortAddr(addr)}${RESET} ${DIM}(${d.summary.total} receipt${d.summary.total === 1 ? '' : 's'})${RESET}`);
      console.log(`  success rate: ${GREEN}${(d.summary.successRate*100).toFixed(0)}%${RESET}`);
      if (d.summary.avgRating != null) console.log(`  avg rating:   ${d.summary.avgRating?.toFixed(1)}/100`);
      if (d.summary.avgLatencyMs != null) console.log(`  avg latency:  ${d.summary.avgLatencyMs}ms`);
    } else {
      console.log(DIM + 'No receipts yet for ' + addr + RESET);
    }
  },

  async watchlist(addr) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr || '')) throw new Error('usage: mainstreet watchlist 0x<subscriber-addr>');
    const d = await api('/api/agent/watchlist?for=' + addr);
    console.log(`${BOLD}Watchlist for ${shortAddr(addr)}${RESET} ${DIM}(${d.count} agents)${RESET}\n`);
    (d.watching || []).forEach((w, i) => {
      const c = color(w.current_score);
      const delta = (w.current_score != null && w.last_score != null) ? (w.current_score - w.last_score) : null;
      const d2 = delta == null ? '' : (delta > 0 ? GREEN+'+'+delta : delta < 0 ? RED+delta : DIM+'=')+RESET;
      console.log(`${DIM}${i+1}.${RESET} ${c}${String(w.current_score ?? '—').padStart(3)}${RESET} ${d2.padEnd(8)} ${shortAddr(w.watch_addr)}  ${(w.label||w.last_description||'').slice(0,50)}`);
    });
  },

  help() {
    console.log(`MainStreet CLI

Usage: mainstreet <command> [args]

Commands:
  score <addr>              Get reputation score for an agent
  compare <a> <b>           Head-to-head comparison
  leaderboard [N=10]        Top N agents
  search <query>            Full-text agent search
  recommend <addr> [N=5]    Similar agents
  history <addr> [days=30]  Score time series
  stats                     Live aggregate stats
  movers [N=5]              Daily top gainers + losers
  featured                  Selection of the Week
  me                        Proof of life
  tags [N=20]               Top N tags across the ecosystem
  tagged <tag> [N=10]       Agents matching a tag, ranked by score
  match <intent...> [--limit N] [--min S] [--max P]
  pick <intent...> [--min S] [--max P]   1 best match as JSON, for piping
                            Intent-based routing — top agents for a task
  receipts <addr>           Public buyer receipts for an agent
  watchlist <addr>          Watched agents of a subscriber

Shortcut: passing only an address runs 'score'.

Environment:
  MAINSTREET_ORIGIN         Override base URL (default: avisradar-production.up.railway.app)

Examples:
  mainstreet score 0x2bb72231eed303cc91a462a1fa738b42b6a9ac6d
  mainstreet leaderboard 20
  mainstreet search polymarket
  mainstreet stats

Docs: https://github.com/philpof102-svg/mainstreet
`);
  },
};

async function main() {
  const args = process.argv.slice(2);
  const first = args[0];
  if (!first || first === '-h' || first === '--help' || first === 'help') return commands.help();
  // Address-shortcut: `mainstreet 0x...` → score
  if (/^0x[a-fA-F0-9]{40}$/.test(first)) return commands.score(first);
  const cmd = commands[first];
  if (!cmd) { console.error(`Unknown command: ${first}\n`); commands.help(); process.exit(1); }
  try { await cmd.apply(null, args.slice(1)); }
  catch (e) { console.error(`\x1b[31merror:\x1b[0m ${e.message}`); process.exit(1); }
}

main();
