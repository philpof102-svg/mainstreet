'use strict';
/**
 * Le serveur MCP publie doit tenir son propre contrat: les outils qu'il annonce, et RIEN d'autre
 * comme route.
 *
 * ⛔ CE QUE CETTE PORTE A TROUVE EN NAISSANT, le 2026-08-15. `scripts/mcp-server.js` part dans le
 * tarball npm sous le nom de commande `mainstreet-mcp`, et aucun test ne l'avait jamais lance.
 * En lui parlant en JSON-RPC sur stdio, contre un stub local, DEUX choses:
 *
 *   1. `mainstreet_score` appele avec `address = "../../../api/agent/audit/0x..."` demandait
 *      reellement `/api/agent/audit/0x...` — la route PAYANTE, sous le nom de l'outil GRATUIT.
 *      `mainstreet_compare` avec `a = "x&b=INJECTE"` envoyait `?a=x&b=INJECTE&b=y`, ou le `b`
 *      injecte precede celui de l'outil. `mainstreet_search` etait le SEUL appel encode: le helper
 *      correct etait deja dans le fichier, et quatre appels sur cinq ne l'appelaient pas.
 *   2. `bin/mainstreet.js` disait a l'agent d'utiliser un outil `mainstreet_audit`. Ce nom
 *      n'apparaissait qu'une fois dans tout le depot — a cet endroit-la, pour le recommander. Le
 *      serveur expose `mainstreet_audit_info`, et un `tools/call` sur un nom inconnu rend -32000.
 *
 * ⚖️ BORNE MESUREE, et elle limite la gravite: l'origine ne pouvait PAS etre quittee. `//peer.invalid/x`
 * reste un CHEMIN (`/api/agent/score///peer.invalid/x`) parce que ORIGIN prefixe la chaine, et les
 * cinq requetes de la mesure sont bien arrivees sur le stub local. Le rayon etait borne aux routes
 * GET de notre propre origine — pas d'exfiltration vers un tiers, et le client MCP n'a aucun moyen
 * de paiement, donc la route payante repond 402 sans rien livrer.
 *
 * ⚖️ AUTRES BORNES. Zero reseau externe: stub sur 127.0.0.1. Cette porte prouve les chemins qu'elle
 * EXERCE — un outil dont aucun cas ne construit d'URL n'est pas couvert. Elle ne dit rien du serveur
 * MCP *heberge* (`/mcp`), qui est une autre surface: c'est lui que le README decrit quand il cite
 * `mainstreet_preflight` ou `mainstreet_verify`, et ces noms-la ne sont pas un ecart.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const RACINE = path.join(__dirname, '..');
const SERVEUR = path.join(RACINE, 'scripts', 'mcp-server.js');
const CLI = path.join(RACINE, 'bin', 'mainstreet.js');

/* ───────── Un stub local qui NOTE le chemin demande, et une session JSON-RPC. ───────── */
function session(argv) {
  const demandes = [];
  const reponses = new Map();
  let stub;
  let proc;

  return {
    demandes,
    async demarrer() {
      stub = http.createServer((req, res) => {
        demandes.push(req.url);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
      });
      await new Promise((r) => stub.listen(0, '127.0.0.1', r));
      const origin = 'http://127.0.0.1:' + stub.address().port;
      proc = spawn(process.execPath, argv, {
        env: Object.assign({}, process.env, { MAINSTREET_ORIGIN: origin }),
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      let tampon = '';
      proc.stdout.on('data', (c) => {
        tampon += c.toString('utf8');
        let i;
        while ((i = tampon.indexOf('\n')) >= 0) {
          const l = tampon.slice(0, i).trim();
          tampon = tampon.slice(i + 1);
          if (!l) continue;
          try { const j = JSON.parse(l); reponses.set(j.id, j); } catch { /* pas du JSON-RPC */ }
        }
      });
      proc.stderr.on('data', () => {});
      return origin;
    },
    /* Envoie et attend la reponse portant cet id. Pas d'horloge: on scrute la Map. */
    async appel(id, method, params) {
      proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
      for (let i = 0; i < 200; i++) {
        if (reponses.has(id)) return reponses.get(id);
        await new Promise((r) => setTimeout(r, 25));
      }
      return null;
    },
    arreter() { if (proc) proc.kill(); if (stub) stub.close(); },
  };
}

/* Chaque cas: un outil, un argument HOSTILE, et le prefixe que la route doit garder. */
const REMONTEES = [
  { outil: 'mainstreet_score', args: { address: '../../../api/agent/audit/0xdead' }, prefixe: '/api/agent/score/' },
  { outil: 'mainstreet_history', args: { address: '../../revenue' }, prefixe: '/api/agent/history/' },
  { outil: 'mainstreet_recommend', args: { for: 'x&limit=999&network=all' }, prefixe: '/api/agent/recommend?' },
  { outil: 'mainstreet_compare', args: { a: 'x&b=INJECTE', b: 'y' }, prefixe: '/api/agent/compare?' },
  { outil: 'mainstreet_search', args: { q: '../../revenue' }, prefixe: '/api/agent/search?' },
];

/* Noms cites par le runtime LOCAL du paquet. Le serveur HEBERGE est une autre surface. */
const AUTRE_SURFACE = new Map([
  ['README.md', 'decrit le serveur HEBERGE (/mcp) et le dit — « natively over the hosted server »'],
  ['CHANGELOG.md', 'historique: cite des outils d autres versions et d autres surfaces'],
  ['smithery.yaml', 'fiche de l annuaire, pointe le serveur heberge'],
  ['sdk/tools.js', 'definitions pour les frameworks de function-calling, pas le serveur stdio'],
]);

let sess;
let outils = [];

test.before(async () => {
  sess = session([SERVEUR]);
  await sess.demarrer();
  const r = await sess.appel(1, 'tools/list', {});
  assert.ok(r && r.result && Array.isArray(r.result.tools), 'le serveur n a pas repondu a tools/list');
  outils = r.result.tools.map((t) => t.name);
});

test.after(() => { if (sess) sess.arreter(); });

test('le serveur repond et annonce ses outils', async () => {
  /* Temoin: une liste vide ferait passer tout le reste en n ayant rien verifie. */
  assert.ok(outils.length >= 8, 'succes vide: ' + outils.length + ' outil(s) annonce(s)');
  assert.ok(outils.includes('mainstreet_score'), 'temoin: `mainstreet_score` doit etre annonce');

  const init = await sess.appel(2, 'initialize', {});
  assert.equal(init.result.serverInfo.name, 'mainstreet', 'initialize doit s identifier');
  assert.equal(init.result.serverInfo.version, require(path.join(RACINE, 'package.json')).version,
    'la version annoncee doit etre celle du paquet, pas une copie');
});

test('aucun nom d outil recommande par le CLI n est inconnu du serveur', () => {
  const src = fs.readFileSync(CLI, 'utf8');
  const cites = [...new Set([...src.matchAll(/mainstreet_[a-z_]+/g)].map((m) => m[0]))];
  /* Temoin: un extracteur qui ne lit rien rendrait ce test vide et toujours vert. */
  assert.ok(cites.length >= 1, 'succes vide: aucun nom d outil lu dans bin/mainstreet.js');
  const inconnus = cites.filter((n) => !outils.includes(n));
  assert.deepEqual(inconnus, [],
    'le CLI recommande un outil que le serveur n expose pas: ' + JSON.stringify(inconnus)
    + '\n  Un `tools/call` sur ce nom rend -32000 « unknown tool ». C est exactement ce que disait'
    + ' `mainstreet_audit`, cite une seule fois dans tout le depot: la, pour le recommander.'
    + '\n  Surfaces volontairement HORS de ce recensement: ' + [...AUTRE_SURFACE.keys()].join(', '));
});

test('un argument de LLM ne peut pas deplacer la route', async () => {
  const fautifs = [];
  for (let i = 0; i < REMONTEES.length; i++) {
    const c = REMONTEES[i];
    const avant = sess.demandes.length;
    await sess.appel(100 + i, 'tools/call', { name: c.outil, arguments: c.args });
    const vues = sess.demandes.slice(avant);
    /* Accessibilite: sans requete, l assertion ne prouverait rien. */
    if (vues.length !== 1) { fautifs.push(c.outil + ': ' + vues.length + ' requete(s) au lieu d une'); continue; }
    if (!vues[0].startsWith(c.prefixe)) fautifs.push(c.outil + ': a demande ' + vues[0]);
  }
  assert.deepEqual(fautifs, [],
    'route(s) deplacee(s) par un argument:\n  ' + fautifs.join('\n  ')
    + '\n  Tout argument qui entre dans une URL passe par `enc()`. Le cas mesure avant correctif:'
    + ' `mainstreet_score` demandait `/api/agent/audit/0x...`, la route PAYANTE.');
});

test('l URL d audit rendue a l agent reste une URL d audit', async () => {
  const r = await sess.appel(200, 'tools/call', { name: 'mainstreet_audit_info', arguments: { address: '../../../ailleurs' } });
  const j = JSON.parse(r.result.content[0].text);
  const chemin = new URL(j.endpoint).pathname;
  assert.equal(chemin.startsWith('/api/agent/audit/'), true,
    'cette URL est rendue a l agent POUR QU IL LA PAIE — elle ne doit pas pouvoir designer une autre'
    + ' route que celle qu elle annonce. Obtenu: ' + chemin);
});

test('les erreurs JSON-RPC gardent leurs codes', async () => {
  const inconnu = await sess.appel(300, 'tools/call', { name: 'mainstreet_inexistant', arguments: {} });
  assert.equal(inconnu.error.code, -32000, 'outil inconnu → -32000');
  const methode = await sess.appel(301, 'methode/inconnue', {});
  assert.equal(methode.error.code, -32601, 'methode inconnue → -32601');
});

test('`mainstreet mcp` demarre bien le serveur', async () => {
  /* La config Claude Desktop imprimee en tete de mcp-server.js est `npx -y mainstreet-oracle mcp`,
   * et ce nom de paquet resout vers bin/mainstreet.js, qui n avait pas de commande `mcp`: mesure du
   * 2026-08-15, « Unknown command: mcp », exit 1. ⚠️ La regle de resolution de npx n a PAS ete
   * executee ici — c est pourquoi le correctif rend les deux chemins vrais au lieu de parier. */
  const s2 = session([CLI, 'mcp']);
  try {
    await s2.demarrer();
    const r = await s2.appel(1, 'tools/list', {});
    assert.ok(r && r.result && r.result.tools.length >= 8,
      '`mainstreet mcp` doit servir la meme liste d outils que `mainstreet-mcp`');
    assert.deepEqual(r.result.tools.map((t) => t.name), outils,
      'les deux chemins d entree doivent servir EXACTEMENT les memes outils');
  } finally {
    s2.arreter();
  }
});

/* ── ★ LE SCHEMA DECLARE `required`, ET PERSONNE NE L'APPLIQUAIT ─────────────────────────────────
 * `inputSchema` n'est pas de la documentation: c'est le CONTRAT qu'un LLM lit pour construire son
 * appel. `mainstreet_score` declare `required: ['address']` et `address: {type:'string'}` — et
 * `enc(undefined)` rend '', donc l'appel partait quand meme.
 *
 * MESURE DU 2026-08-15 contre le stub local, en attribuant les requetes UNE PAR UNE:
 *     {}                  -> requete PARTIE  /api/agent/score/
 *     {address:''}        -> requete PARTIE  /api/agent/score/
 *     {address:{a:1}}     -> requete PARTIE  /api/agent/score/%5Bobject%20Object%5D
 * Et avec l'origine injoignable, les TROIS revenaient en `-32000 fetch failed` — le message d'une
 * PANNE DE SERVICE.
 *
 * ⚖️ C'EST LA QUE CA COUTE: un agent autonome ne peut pas distinguer SA faute de NOTRE panne, et les
 * deux appellent des conduites opposees — une panne se reessaie, un appel malforme se corrige.
 * Servir le meme message aux deux enseigne a l'agent de boucler sur son propre bug.
 *
 * ⚖️ CE QUI N'EST PAS EXIGE ICI: la forme « 0x + 40 hex » ne vit que dans la `description`, en prose.
 * L'exiger serait plus strict que ce qu'on a ANNONCE, et refuser une adresse qu'un futur reseau
 * ecrirait autrement est une decision produit. Le serveur la tranche deja. */
const ARGS_INVALIDES = [
  ['aucun argument', {}],
  ['address absente', { autre: 1 }],
  ['address vide', { address: '' }],
  ['address blanche', { address: '   ' }],
  ['address = objet', { address: { a: 1 } }],
  ['address = nombre', { address: 42 }],
];

test('★ un appel qui viole le schema DECLARE est refuse SANS toucher le reseau', async () => {
  const s = session([SERVEUR]);
  await s.demarrer();
  try {
    await s.appel(1, 'initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 't', version: '0' } });
    const avantTout = s.demandes.length;
    let id = 100;
    for (const [titre, args] of ARGS_INVALIDES) {
      const avant = s.demandes.length;
      const r = await s.appel(++id, 'tools/call', { name: 'mainstreet_score', arguments: args });
      assert.ok(r, titre + ': aucune reponse du serveur');
      assert.equal(s.demandes.length, avant,
        titre + ': une requete reseau est partie pour un appel que le schema declare invalide — '
        + 'chaque appel malforme coute alors un aller-retour reel. Chemin: ' + s.demandes[avant]);
      const msg = JSON.stringify(r.error || r.result);
      assert.match(msg, /CALLER error/,
        titre + ': le refus doit dire que la faute est celle de l APPELANT. Sinon un agent lit le meme '
        + 'message qu une panne, reessaie, et boucle sur son propre bug. Recu: ' + msg.slice(0, 140));
      assert.ok(!/fetch failed/.test(msg),
        titre + ': le refus ne doit pas se deguiser en panne reseau. Recu: ' + msg.slice(0, 140));
    }
    assert.equal(s.demandes.length, avantTout, 'AUCUNE des entrees invalides ne doit atteindre le reseau');
  } finally { s.arreter(); }
});

test('⚖️ TEMOIN — une chaine bien formee ATTEINT toujours le reseau (la garde ne bloque pas tout)', async () => {
  /* ⛔ Sans lui, une garde qui refuserait TOUT satisferait le cas precedent et casserait l outil.
   * On verifie aussi qu une chaine que le schema accepte mais que la prose refuserait (pas du 0x)
   * passe bien: on applique le contrat DECLARE, pas la description. */
  const s = session([SERVEUR]);
  await s.demarrer();
  try {
    await s.appel(1, 'initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 't', version: '0' } });
    const avant = s.demandes.length;
    await s.appel(2, 'tools/call', { name: 'mainstreet_score', arguments: { address: '0x' + '11'.repeat(20) } });
    assert.equal(s.demandes.length, avant + 1, 'une adresse valide doit atteindre le reseau');
    assert.match(s.demandes[avant], /^\/api\/agent\/score\/0x1{40}$/, 'et sur la bonne route');

    await s.appel(3, 'tools/call', { name: 'mainstreet_score', arguments: { address: 'pas-une-adresse' } });
    assert.equal(s.demandes.length, avant + 2,
      'une CHAINE non vide satisfait le schema declare: c est au serveur de la juger, pas a ce client '
      + 'de decreter une forme que le schema n annonce pas');
  } finally { s.arreter(); }
});
