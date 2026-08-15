#!/usr/bin/env node
// probe-directory-listings.js — les annuaires annoncent-ils ce que le serveur SERT ?
// ================================================================================================
// Un annuaire indexe UNE FOIS et ne re-mesure jamais. Sa fiche est un instantane date, pas un miroir,
// et rien dans le protocole ne signale l ecart au lecteur: il voit « 19 outils » avec la meme confiance
// qu il verrait 43. C est le pendant du meme-numero-de-version cote npm — la donnee est bien formee,
// servie, et fausse; seule une comparaison avec la SOURCE VIVANTE discrimine.
//
// Mesure du 2026-08-14 qui a motive ce fichier:
//   endpoint vivant (tools/list)   43 outils
//   Smithery, liste indexee        17
//   Smithery, texte de description 19          <- ses deux propres champs se contredisent
//   MCP Registry officiel          coherent (version + endpoint)
// La fiche Smithery a ete creee le 2026-06-05 depuis la branche `add-smithery-config` (jamais fusionnee,
// elle nomme 4 outils), et elle porte 2881 usages. Deux mois de croissance ne sont jamais arrives a
// l annuaire, et rien ne le disait.
//
// ⛔ CE QU IL NE FAIT PAS. Il ne RAFRAICHIT rien: re-indexer chez Smithery demande un geste sur leur
// compte, donc humain et sortant. Il ne juge pas non plus la COPIE de vente — quels outils mettre en
// avant et comment les decrire est une decision produit, pas une mesure. Il compare des NOMBRES.
//
// ⛔ BORNES. Il lit les annuaires PUBLICS sans authentification: le deploiement heberge par Smithery
// (`*.run.tools`) repond 401 a la racine, donc ce qu il SERT reellement n a pas ete verifie et ne peut
// pas l etre d ici. Un annuaire absent de cette liste n est pas mesure — l absence de preuve n est pas
// une preuve d absence. Et « 43 » est ce que l endpoint sert AU MOMENT du run, pas une constante.
//
// ⛔ Lecture seule, bornee, `x-ms-monitor: 1` pour que nos sondes ne comptent pas comme des appels
// externes. `tools/list` enumere, il n invoque aucun outil paye.
//
// Run: node scripts/probe-directory-listings.js       (MAINSTREET_URL pour viser un autre endpoint)
'use strict';

const ENDPOINT = process.env.MAINSTREET_URL || 'https://avisradar-production.up.railway.app';
const SMITHERY = 'https://registry.smithery.ai/servers/philpof102/mainstreet';
const REGISTRE = 'https://registry.modelcontextprotocol.io/v0/servers?search=mainstreet';

const borne = (ms) => ({ signal: AbortSignal.timeout(ms), headers: { 'x-ms-monitor': '1' } });

async function outilsServis() {
  const r = await fetch(ENDPOINT + '/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'x-ms-monitor': '1' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    signal: AbortSignal.timeout(25000),
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const texte = await r.text();
  const i = texte.indexOf('{');                       // une reponse SSE prefixe le JSON
  const j = JSON.parse(i > 0 ? texte.slice(i) : texte);
  /* ⛔ UNE ERREUR JSON-RPC EST UN HTTP 200. `((j.result||{}).tools||[]).length` rendait 0 sur une
   * reponse `{error:{...}}` (ou un `result` sans `tools`), et 0 est une MESURE, pas une panne: avec
   * servis=0, CHAQUE annuaire (17/19/43) ressort en « ECART de -17 », et ce fichier accuse les annuaires
   * pour NOTRE propre source errornee — exactement le collapse que son en-tete interdit (« il ne faut
   * surtout pas accuser un annuaire sur notre propre incapacite a lire »). Mesure du 2026-08-15.
   * Une liste PRESENTE, meme vide, est un compte legitime (un vrai serveur a 0 outil rend `tools:[]`);
   * son absence est illisible et doit JETER (-> le catch de main met exitCode 2 « NON LU »). */
  if (j.error) throw new Error('JSON-RPC error ' + (j.error.code != null ? j.error.code + ' ' : '') + String(j.error.message || ''));
  const tools = j.result && j.result.tools;
  if (!Array.isArray(tools)) throw new Error('reponse sans result.tools — forme inattendue de tools/list');
  return tools.length;
}

async function main() {
  console.log('\n  endpoint : ' + ENDPOINT);

  /* TROIS ETATS. Si la SOURCE n est pas lisible, aucun ecart n est mesurable et il ne faut surtout pas
   * accuser un annuaire sur notre propre incapacite a lire. */
  let servis = null;
  try { servis = await outilsServis(); } catch (e) {
    console.log('\n  ⚠️ NON LU : ' + String((e && e.message) || e));
    console.log('  La source ne repond pas — aucun ecart n est mesurable. Ce n est PAS « les annuaires ont tort ».');
    process.exitCode = 2;
    return;
  }
  console.log('  SOURCE   : ' + servis + ' outils servis par tools/list\n');

  const releve = [];

  try {
    const r = await fetch(SMITHERY, borne(20000));
    const d = await r.json();
    const indexes = Array.isArray(d.tools) ? d.tools.length : null;
    const prose = (String(d.description || '').match(/(\d+)\s+MCP tools/i) || [])[1];
    releve.push({ ou: 'Smithery (liste indexee)', n: indexes, usages: d.useCount });
    releve.push({ ou: 'Smithery (description)', n: prose == null ? null : Number(prose), usages: d.useCount });
  } catch (e) { releve.push({ ou: 'Smithery', n: null, erreur: String((e && e.message) || e) }); }

  try {
    const r = await fetch(REGISTRE, borne(20000));
    const d = await r.json();
    const e = (d.servers || []).map((x) => x.server || x).filter((x) => /mainstreet/i.test(x.name || ''));
    // Le registre officiel ne publie pas de compte d outils: on releve ce qu il annonce VRAIMENT.
    releve.push({ ou: 'MCP Registry (versions)', n: null,
      note: e.length ? e.map((x) => x.version).join(', ') : 'aucune entree' });
    /* ⛔ ET CE QU IL FAIT INSTALLER. Une entree peut etre parfaitement bien formee et envoyer chercher un
     * paquet ABANDONNE: mesure du 2026-08-14, trois des quatre entrees nomment @raskhaaa/mainstreet-oracle,
     * le scope que le renommage a laisse derriere lui et qui ne recevra jamais de correctif. La plus
     * recente (0.9.1) ne declare aucun paquet et route vers le remote vivant, donc elle est saine — mais un
     * client qui EPINGLE une version, ou qui les liste, voit les trois autres. C est mecanique, pas un
     * jugement: on compare un nom de paquet a celui que `package.json` declare. */
    const CANON = require('../package.json').name;
    const morts = [];
    for (const x of e) for (const p of (x.packages || [])) {
      if (p.identifier && p.identifier !== CANON) morts.push('v' + x.version + ' -> ' + p.identifier);
    }
    releve.push({ ou: 'MCP Registry (paquets)', n: null, mauvais: morts,
      note: morts.length ? morts.length + ' entree(s) nomment un paquet AUTRE que ' + CANON + ': ' + morts.join(' | ')
        : 'toutes les entrees nomment ' + CANON });
  } catch (e) { releve.push({ ou: 'MCP Registry', n: null, erreur: String((e && e.message) || e) }); }

  /* mcp.so ne publie AUCUN compte d outils, donc il n y a rien de numerique a comparer — mais un annuaire
   * MODERE peut DE-lister, et ca, ca se mesure en une requete. Mesure du 2026-08-14: la fiche est propre
   * (elle pointe l endpoint vivant, sans compte fige ni paquet abandonne), et l enumeration par sitemap
   * (18472 serveurs, 19 pages, temoin `firecrawl` trouve) confirme `mainstreet` present, `biii` et `lawbor`
   * absents. ⛔ Etre LISTE ou non est une decision de distribution: on ne juge pas ici, on constate. Etre
   * DE-liste, en revanche, est un changement d etat qu il vaut mieux ne pas apprendre par hasard.
   * ⛔ robots.txt de mcp.so interdit /api/ et /search — on ne les touche pas. */
  try {
    const r = await fetch('https://mcp.so/servers/mainstreet', borne(20000));
    releve.push({ ou: 'mcp.so (presence)', n: null,
      note: r.status === 200 ? 'listee (HTTP 200)' : 'HTTP ' + r.status + ' — DE-LISTEE ou deplacee ?',
      mauvais: r.status === 200 ? [] : ['mcp.so HTTP ' + r.status] });
  } catch (e) { releve.push({ ou: 'mcp.so (presence)', n: null, erreur: String((e && e.message) || e) }); }

  let ecarts = 0, illisibles = 0;
  for (const l of releve) {
    if (l.erreur) { console.log('  ' + l.ou.padEnd(26) + 'NON LU  ' + l.erreur); illisibles++; continue; }
    if (l.n == null) {
      /* Un releve sans compte peut quand meme porter un DEFAUT: nommer un paquet abandonne est un ecart
       * au meme titre qu un chiffre faux — il envoie chercher du code qui ne sera jamais corrige. */
      if (l.mauvais && l.mauvais.length) ecarts++;
      console.log('  ' + l.ou.padEnd(26) + (l.mauvais && l.mauvais.length ? 'ECART   ' : '-       ')
        + (l.note || 'pas de compte publie'));
      continue;
    }
    const ok = l.n === servis;
    if (!ok) ecarts++;
    console.log('  ' + l.ou.padEnd(26) + String(l.n).padEnd(8) + (ok ? 'concorde' : 'ECART de ' + (servis - l.n))
      + (l.usages != null ? '   (' + l.usages + ' usages)' : ''));
  }

  if (ecarts) {
    console.log('\n  ⛔ ' + ecarts + ' annonce(s) ne correspondent pas a ce que le serveur sert.');
    console.log('     Un lecteur d annuaire voit le chiffre annonce avec la meme confiance que le vrai.');
    console.log('     ⚖️ Rafraichir la fiche est un geste humain sur le compte de l annuaire.');
    process.exitCode = 1;
    return;
  }
  if (illisibles) {
    console.log('\n  ⚠️ NON CONCLU : ' + illisibles + ' annuaire(s) illisible(s). Ce n est pas « tout concorde ».');
    process.exitCode = 2;
    return;
  }
  console.log('\n  ✅ Les annuaires mesures annoncent ce que le serveur sert.');
  console.log('     ⛔ Ce qui ne couvre QUE les annuaires listes ici, sans authentification.');
}

main().catch((e) => { console.error(e); process.exitCode = 2; });
