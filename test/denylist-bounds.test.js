'use strict';
/**
 * UNE BORNE ILLISIBLE VIDAIT LA DENYLIST, ET LE SCRIPT APPELAIT CA UN SUCCES.
 *
 * `scripts/rekts-to-denylist.js` produit la liste known-bad que le loader MainStreet fusionne a cote
 * d'OFAC, eth-labels et ScamSniffer. Sa boucle de pagination etait bornee par
 *     const maxPages = mpIdx > -1 ? parseInt(argv[mpIdx + 1]) : 20;
 * `parseInt(undefined)` vaut NaN, et `page <= NaN` est FAUX: la boucle ne tournait pas une seule
 * fois, AUCUN appel API n'etait emis, et le fichier partait quand meme avec `count: 0` — suivi de
 * « Next: merge into the MainStreet known-bad loader ». Exit 0.
 *
 * MESURE DU 2026-08-15, endpoint pointe sur 127.0.0.1:1 pour prouver qu'aucun appel ne part:
 *     --max-pages 2     -> « Pulling de.fi rekts (max 2 pages) », echec reseau, exit 1, RIEN d'ecrit
 *     --max-pages       -> exit 0, fichier ecrit, count=0
 *     --max-pages abc   -> exit 0, fichier ecrit, count=0
 *     --max-pages 0     -> exit 0, fichier ecrit, count=0
 *     --max-pages -5    -> exit 0, fichier ecrit, count=0
 *
 * ⚖️ LA DIRECTION EST TOUT. Sur une denylist, le vide echoue OUVERT: une liste absente ne bloque
 * personne, et sa forme est indistinguable d'une extraction reussie. « 0 unique known-bad addresses
 * extracted » est de surcroit une affirmation sur la SOURCE, alors que la source n'a jamais ete
 * interrogee.
 *
 * ⛔ BORNE DE CE TEST: il n'ouvre AUCUNE connexion. Le refus se produit avant toute requete, donc on
 * l'observe sur le code de sortie; et le TEMOIN se contente de verifier que le script a DEPASSE la
 * garde (il annonce « Pulling ... »), sans rien attendre du reseau. Il ne teste ni de.fi, ni
 * l'extraction — `--dry-run` porte deja son propre self-test 13/13 pour ca.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync, spawn } = require('node:child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'rekts-to-denylist.js');

/* Les deux portes locales sont ouvertes avec des valeurs BIDON pour atteindre le code teste, et
 * l'endpoint pointe sur un port mort en loopback: si une requete partait malgre tout, elle echouerait
 * ici et ne joindrait jamais de.fi. */
const lancer = (...args) => {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env, DEFI_API_URL: 'http://127.0.0.1:1/graphql', DEFI_API_KEY: 'cle-bidon-locale', DEFI_LICENSE_OK: '1' },
  });
  if (r.error) throw new Error('impossible de lancer le script: ' + r.error.message);
  return { code: r.status, sortie: String(r.stdout || '') + String(r.stderr || '') };
};

const MAUVAISES = [
  [[], 'aucune valeur apres --max-pages (parseInt(undefined) = NaN)'],
  [['abc'], 'valeur non numerique (NaN)'],
  [['0'], 'zero page: la boucle ne tourne jamais'],
  [['-5'], 'nombre negatif'],
  [['2.5'], 'non entier'],
];

for (const [valeur, pourquoi] of MAUVAISES) {
  test(`--max-pages ${JSON.stringify(valeur[0] ?? null)} est REFUSE (${pourquoi})`, () => {
    const r = lancer('--max-pages', ...valeur);
    assert.equal(r.code, 2,
      'une borne que la boucle ne sait pas lire est une borne de ZERO: aucun appel API, et une '
      + 'denylist VIDE ecrite comme un pull reussi. Sur une known-bad list, vide echoue OUVERT.\n' + r.sortie);
    assert.ok(!/Pulling de\.fi rekts/.test(r.sortie),
      'le refus doit tomber AVANT toute tentative de requete — sinon il brule des credits pour rien:\n' + r.sortie);
    assert.ok(/positive integer/.test(r.sortie), 'le refus doit dire ce qui est attendu:\n' + r.sortie);
  });
}

test('TEMOIN — une valeur VALIDE franchit la garde (sinon elle refuserait tout)', () => {
  /* ⛔ Sans ce temoin, une garde qui refuse absolument tout passerait les cinq cas ci-dessus en
   * beaute, et le script ne pourrait plus jamais produire de denylist. On n'attend RIEN du reseau:
   * la seule chose asserte est que la garde a laisse passer. */
  const r = lancer('--max-pages', '2');
  assert.ok(/Pulling de\.fi rekts \(max 2 pages\)/.test(r.sortie),
    'la garde mord plus que la panne qu elle repare: une valeur valide doit atteindre le pull:\n' + r.sortie);
  assert.notEqual(r.code, 2, 'exit 2 est le code du REFUS de parametre; une valeur valide ne doit pas le porter');
});

test('TEMOIN — sans --max-pages du tout, le defaut de 20 pages tient', () => {
  const r = lancer();
  assert.ok(/Pulling de\.fi rekts \(max 20 pages\)/.test(r.sortie),
    'omettre l option doit garder le defaut documente, pas declencher le refus:\n' + r.sortie);
});

/* ── le second refus: ZERO ADRESSE N'EST PAS UNE DENYLIST ────────────────────────────────────────
 * Ce chemin n'est atteignable que par un pull QUI REUSSIT, donc aucun des cas ci-dessus ne le
 * touche. On monte un stub HTTP sur 127.0.0.1, port ephemere: rien ne sort de la machine, et de.fi
 * n'est jamais joint. Le stub est ferme dans tous les cas, y compris en cas d echec. */
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');

const avecStub = async (charge, fn) => {
  const srv = http.createServer((req, res) => {
    let corps = '';
    req.on('data', (c) => { corps += c; });
    req.on('end', () => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: { rekts: charge } }));
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port;
  try { return await fn(`http://127.0.0.1:${port}/graphql`); }
  finally { await new Promise((r) => srv.close(r)); }
};

/* ⚠️ ASYNCHRONE, ET C'EST LA CONDITION POUR QUE CE STUB REPONDE. `spawnSync` bloque la boucle
 * d'evenements du process de test — or le stub HTTP tourne dans CE process. Avec un spawn
 * synchrone, l'enfant attend une reponse que le parent ne peut pas emettre tant qu'il est bloque:
 * les deux se regardent jusqu'au timeout. Un serveur en-process impose un lancement asynchrone. */
const lancerVers = (url, ...args) => new Promise((resolve, reject) => {
  const enfant = spawn(process.execPath, [SCRIPT, ...args], {
    env: { ...process.env, DEFI_API_URL: url, DEFI_API_KEY: 'cle-bidon-locale', DEFI_LICENSE_OK: '1' },
  });
  let sortie = '';
  enfant.stdout.on('data', (c) => { sortie += c; });
  enfant.stderr.on('data', (c) => { sortie += c; });
  const minuteur = setTimeout(() => { enfant.kill(); reject(new Error('le script n a pas rendu la main en 30 s')); }, 30000);
  enfant.on('error', (e) => { clearTimeout(minuteur); reject(new Error('impossible de lancer le script: ' + e.message)); });
  enfant.on('close', (code) => { clearTimeout(minuteur); resolve({ code, sortie }); });
});

const fichierJetable = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ms-denylist-')), 'out.json');

test('un pull REUSSI mais VIDE refuse d ecrire la denylist', async () => {
  const out = fichierJetable();
  const r = await avecStub({ items: [], pageInfo: { hasNextPage: false } },
    async (url) => lancerVers(url, '--out', out, '--max-pages', '1'));
  assert.equal(r.code, 3,
    'un pull vide doit refuser d ecrire: `addresses: []` fusionne dans le known-bad loader ne bloque '
    + 'plus personne, et sa forme est indistinguable d une extraction reussie.\n' + r.sortie);
  assert.ok(!fs.existsSync(out), 'aucun fichier ne doit rester derriere un refus: ' + out);
});

test('TEMOIN — un pull qui rend une adresse ECRIT bien la denylist', async () => {
  /* ⛔ Sans ce temoin, un refus pose sur TOUT pull passerait le cas precedent et casserait l outil.
   * Il fait aussi tourner extractRows de bout en bout pour la premiere fois dans la suite. */
  const out = fichierJetable();
  const incident = {
    project: 'StubSwap', category: 'exit-scam', chain: 'base',
    scammerAddress: '0xAbCdEf0000000000000000000000000000000009',
    addresses: ['0x2222222222222222222222222222222222222222', 'pas-une-adresse'],
  };
  const r = await avecStub({ items: [incident], pageInfo: { hasNextPage: false } },
    (url) => lancerVers(url, '--out', out, '--max-pages', '1'));
  assert.equal(r.code, 0, 'un pull non vide doit reussir:\n' + r.sortie);
  assert.ok(fs.existsSync(out), 'le fichier doit etre ecrit: ' + out);
  const j = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.equal(j.count, j.addresses.length, 'le compte annonce doit etre celui de la liste');
  assert.equal(j.count, 2, 'deux adresses valides attendues (scammer + listed); la troisieme est malformee');
  assert.ok(j.addresses.every((a) => /^0x[0-9a-f]{40}$/.test(a.address)),
    'toute adresse ecrite doit etre normalisee et bien formee: ' + JSON.stringify(j.addresses));
});

test('le self-test hors ligne du script reste vert (--dry-run, 13/13)', () => {
  const r = spawnSync(process.execPath, [SCRIPT, '--dry-run'], { encoding: 'utf8', timeout: 30000 });
  if (r.error) throw new Error('impossible de lancer le script: ' + r.error.message);
  const sortie = String(r.stdout || '') + String(r.stderr || '');
  assert.equal(r.status, 0, 'le --dry-run doit rester vert:\n' + sortie);
  /* On lit le RAPPORT, pas seulement le code de sortie: un self-test qui n'imprimerait plus rien
   * sortirait 0 en n'ayant rien verifie. */
  const m = sortie.match(/\[self-test\] (\d+)\/(\d+) checks passed/);
  assert.ok(m, 'le self-test doit publier son compte:\n' + sortie);
  assert.equal(m[1], m[2], 'des verifications du self-test echouent: ' + m[0]);
  assert.ok(Number(m[2]) >= 8, 'succes vide: seulement ' + m[2] + ' verification(s)');
});
