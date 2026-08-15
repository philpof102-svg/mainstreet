'use strict';
/**
 * UN 404 AVEC UN CORPS JSON EST UN `r.json()` PARFAITEMENT REUSSI.
 *
 * `scripts/probe-directory-listings.js` compare ce que les annuaires ANNONCENT a ce que l'endpoint
 * SERT. Son en-tete pose la regle qui compte: « il ne faut surtout pas accuser un annuaire sur notre
 * propre incapacite a lire ». Il l'applique rigoureusement a NOTRE source (une erreur JSON-RPC arrive
 * en HTTP 200, donc elle est detectee explicitement) — et ne l'appliquait pas aux annuaires.
 *
 * Sur trois lectures, seule mcp.so testait le status HTTP. Smithery et le MCP Registry faisaient
 * `await r.json()` directement: sur un 404 au corps JSON, l'objet d'erreur passe pour une fiche.
 *
 * MESURE DU 2026-08-15, stub local rendant 404 sur les trois:
 *     Smithery x2              « pas de compte publie »          ni ecart, ni illisible
 *     MCP Registry (versions)  « aucune entree »                 affirme qu on n est pas liste
 *     MCP Registry (paquets)   « toutes les entrees nomment X »  SATISFECIT tire d un ensemble VIDE
 *     mcp.so                   « ECART HTTP 404 »                la seule qui voyait
 * Et lorsque mcp.so repondait 200, le run se terminait sur « ✅ Les annuaires mesures annoncent ce
 * que le serveur sert », exit 0, sur quatre lignes fabriquees.
 *
 * ⛔ CE TEST N'OUVRE AUCUNE CONNEXION SORTANTE. Les quatre URL (endpoint + 3 annuaires) sont
 * surchargeables par env et pointees sur un stub HTTP en loopback, ferme dans un `finally`. Il ne
 * mesure ni Smithery, ni le registre, ni mcp.so — il mesure ce que la SONDE conclut de ce qu'elle
 * lit, ce qui est la seule chose qu'un test hors ligne puisse etablir.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'probe-directory-listings.js');

/* Un stub qui repond ce qu'on lui dit, route par route. L'ordre des tests d'URL importe: on compare
 * des chemins EXACTS pour ne pas retomber sur le piege qui a fausse la premiere mesure du jour
 * (`'/mcpso'.startsWith('/mcp')` est vrai, et /mcpso partait dans la branche de l'endpoint). */
const avecStub = async (routes, fn) => {
  const srv = http.createServer((req, res) => {
    const chemin = req.url.split('?')[0];
    const r = routes[chemin] || { code: 404, corps: { error: 'route inconnue du stub' } };
    const repond = () => {
      res.writeHead(r.code, { 'content-type': 'application/json' });
      res.end(JSON.stringify(r.corps));
    };
    if (req.method === 'POST') { req.on('data', () => {}); req.on('end', repond); } else repond();
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  try { return await fn(base); } finally { await new Promise((r) => srv.close(r)); }
};

/* ⚠️ ASYNCHRONE, obligatoire: `spawnSync` bloque la boucle d'evenements de ce process, et le stub y
 * vit. Un enfant synchrone attendrait une reponse que son parent ne peut pas emettre. */
const lancer = (base) => new Promise((resolve, reject) => {
  const enfant = spawn(process.execPath, [SCRIPT], {
    env: {
      ...process.env,
      MAINSTREET_URL: base,
      SMITHERY_URL: base + '/smithery',
      MCP_REGISTRY_URL: base + '/registre',
      MCPSO_URL: base + '/mcpso',
    },
  });
  let sortie = '';
  enfant.stdout.on('data', (c) => { sortie += c; });
  enfant.stderr.on('data', (c) => { sortie += c; });
  const minuteur = setTimeout(() => { enfant.kill(); reject(new Error('la sonde n a pas rendu la main en 60 s')); }, 60000);
  enfant.on('error', (e) => { clearTimeout(minuteur); reject(new Error('impossible de lancer la sonde: ' + e.message)); });
  enfant.on('close', (code) => { clearTimeout(minuteur); resolve({ code, sortie }); });
});

const OUTILS = { code: 200, corps: { jsonrpc: '2.0', id: 1, result: { tools: [{ name: 'a' }, { name: 'b' }, { name: 'c' }] } } };
const SMITHERY_OK = { code: 200, corps: { tools: [{ name: 'a' }, { name: 'b' }, { name: 'c' }], description: 'serves 3 MCP tools', useCount: 2881 } };
const REGISTRE_OK = { code: 200, corps: { servers: [{ server: { name: 'io.github.x/mainstreet', version: '0.9.3', packages: [{ identifier: 'mainstreet-oracle' }] } }] } };
const MCPSO_OK = { code: 200, corps: { ok: true } };
const QUATRE_CENT_QUATRE = { code: 404, corps: { error: 'Server not found' } };

test('TEMOIN — tout concorde: la sonde conclut, et exit 0', async () => {
  /* ⛔ Sans ce temoin, une sonde qui crierait au loup sur TOUT passerait les cas suivants. */
  const r = await avecStub({ '/mcp': OUTILS, '/smithery': SMITHERY_OK, '/registre': REGISTRE_OK, '/mcpso': MCPSO_OK }, lancer);
  assert.equal(r.code, 0, 'un releve coherent doit conclure:\n' + r.sortie);
  assert.ok(/annoncent ce que le serveur sert/.test(r.sortie), 'la conclusion positive doit rester possible:\n' + r.sortie);
});

test('un annuaire en 404 est NON LU, jamais « pas de compte publie »', async () => {
  const r = await avecStub({ '/mcp': OUTILS, '/smithery': QUATRE_CENT_QUATRE, '/registre': QUATRE_CENT_QUATRE, '/mcpso': MCPSO_OK }, lancer);
  assert.ok(!/annoncent ce que le serveur sert/.test(r.sortie),
    'DEUX annuaires n ont pas repondu et la sonde a conclu que tout concorde. Un 404 au corps JSON '
    + 'traverse `r.json()` sans bruit; sans test de `r.ok` il devient une fiche vide, et une fiche vide '
    + 'ne compte ni comme ecart ni comme illisible.\n' + r.sortie);
  assert.ok(/NON CONCLU/.test(r.sortie), 'l incompletude doit apparaitre dans le BILAN, pas seulement ligne a ligne:\n' + r.sortie);
  assert.equal(r.code, 2, 'exit 2 = non conclu; 0 dirait « tout va bien » et 1 accuserait les annuaires:\n' + r.sortie);
  assert.ok(!/aucune entree/.test(r.sortie),
    'un registre injoignable ne doit pas AFFIRMER qu on n y est pas liste:\n' + r.sortie);
});

test('des ECARTS et des NON LU dans le meme run: les DEUX lignes sortent', async () => {
  /* La version precedente rendait la main sur la premiere des deux: un run avec 1 ecart et
   * 2 illisibles n imprimait QUE l ecart, et l incompletude disparaissait de la seule ligne qu un
   * humain lit. */
  const r = await avecStub({ '/mcp': OUTILS, '/smithery': QUATRE_CENT_QUATRE, '/registre': QUATRE_CENT_QUATRE, '/mcpso': QUATRE_CENT_QUATRE }, lancer);
  assert.ok(/NON CONCLU/.test(r.sortie), 'la ligne d incompletude manque:\n' + r.sortie);
  assert.ok(/ne correspondent pas a ce que le serveur sert/.test(r.sortie), 'la ligne d ecart manque:\n' + r.sortie);
  assert.equal(r.code, 1, 'un ecart est actionnable: il garde la priorite sur le code de sortie');
});

test('un registre VIDE ne devient pas « toutes les entrees sont propres »', async () => {
  const r = await avecStub({
    '/mcp': OUTILS, '/smithery': SMITHERY_OK, '/mcpso': MCPSO_OK,
    '/registre': { code: 200, corps: { servers: [] } },
  }, lancer);
  assert.ok(/aucune entree a verifier/.test(r.sortie),
    '« toutes les entrees nomment X » sur un ensemble VIDE est vrai par vacuite et se lit comme un '
    + 'satisfecit: rien ne distingue plus « tout est propre » de « il n y avait rien a verifier ».\n' + r.sortie);
  assert.ok(!/toutes les entrees nomment/.test(r.sortie), 'la formule vacante ne doit plus sortir:\n' + r.sortie);
});

test('la source illisible n accuse AUCUN annuaire (la regle que le fichier annonce)', async () => {
  /* Le comportement deja correct avant ce commit — pinne pour qu il le reste: c est la propriete
   * fondatrice de la sonde, et rien ne l assertait. */
  const r = await avecStub({ '/mcp': { code: 500, corps: { error: 'boom' } }, '/smithery': SMITHERY_OK, '/registre': REGISTRE_OK, '/mcpso': MCPSO_OK }, lancer);
  assert.equal(r.code, 2, 'source illisible = non conclu:\n' + r.sortie);
  assert.ok(/NON LU/.test(r.sortie), 'la sonde doit dire qu elle n a pas lu:\n' + r.sortie);
  assert.ok(!/ECART/.test(r.sortie), 'aucun annuaire ne doit etre accuse quand c est NOTRE source qui manque:\n' + r.sortie);
});
