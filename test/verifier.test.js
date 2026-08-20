'use strict';
/**
 * Le verificateur publie est une PORTE DE PAIEMENT: il doit refuser plus souvent qu'il n'accepte.
 *
 * `sdk/verifier.js` est exporte sous `mainstreet-oracle/verifier` et part dans le tarball npm. Avant
 * ce fichier, RIEN ne le chargeait — ni un test, ni `sdk/index.js`. Mesure du 2026-08-15, avec un
 * serveur local et un viem bouchonne qui NOTE ce qu'on lui donne:
 *
 *  1. LE DOMAINE EIP-712 VENAIT DE L'OBJET VERIFIE. `attestation.eip712?.domain || DOMAIN` — une
 *     attestation portant `{name:'UN-AUTRE-PROTOCOLE', version:'9', chainId:1}` faisait passer CE
 *     domaine-la a la recuperation de signature, et `verifyAttestation` rendait `true`. Les
 *     constantes epinglees existent dans le meme fichier et ne servaient que de REPLI. Separer les
 *     domaines est precisement ce qui empeche une signature faite ailleurs de valoir ici.
 *
 *  2. LES BORNES S'OUVRAIENT SUR UNE VALEUR NON NUMERIQUE. Mesure, avec `minScore = 50`:
 *       payload {}                       -> A RENDU undefined
 *       payload sans timestamp ni score  -> A RENDU undefined
 *       score 99 sans horodatage         -> A RENDU 99
 *       horodatage "abc"                 -> A RENDU 99
 *       horodatage vieux de 10 jours     -> leve (la borne marche quand elle a un nombre)
 *       score null                       -> leve (`null < 50` est VRAI)
 *     `Number(undefined)` et `Number('abc')` valent NaN, et `NaN > 86400` est FAUX: la garde de
 *     fraicheur echoue OUVERTE. Et `undefined < 50` est FAUX la ou `null < 50` est VRAI — les deux
 *     valeurs « absentes » se comportent a l'OPPOSE dans la meme comparaison.
 *
 *  3. LE REFUS DU SERVEUR N'ETAIT PAS LU. En prod, `/api/agent/attestation/<addr>` repond HTTP 200
 *     avec `signed:false`, un `reason` (`score-built-on-incomplete-read`) et un `retry`: le refus est
 *     dans le CORPS, pas dans le statut. `fetchAttestation` ne teste que `r.ok` et rendait ce corps.
 *     ⚠️ Sur cette forme-la, `requireMinScore` LEVAIT deja — mais un TypeError sur `payload`
 *     indefini, pas un refus lisible. Le fail-open du point 2 n'apparait que si `payload` EXISTE.
 *
 * ⚖️ BORNES. Zero reseau: serveur sur 127.0.0.1 et viem bouchonne. Un bouchon qui rend toujours
 * l'operateur NE PROUVE PAS qu'une vraie signature recupererait cette adresse — il prouve ce que le
 * module TRANSMET a la recuperation, ce qui est exactement le defaut vise. Ce fichier ne dit rien de
 * la verification ON-CHAIN (`buildOnchainCall`), qui n'est pas exercee ici.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');

const RACINE = path.join(__dirname, '..');
const A = '0x' + '11'.repeat(20);
const SUJET = '0x' + '00'.repeat(32);

let srv;
let V;
let corps = null;
let statut = 200;
/* CE QUI A ETE ENVOYE SUR LE FIL, pas ce que le test croit avoir passe. `JSON.stringify` peut
 * SUPPRIMER une cle (`undefined`) sans rien dire: seule la lecture du corps recu le prouve. */
let recu = null;
const vus = [];
const viemStub = { recoverTypedDataAddress: async (a) => { vus.push(a); return V.OPERATOR; } };

test.before(async () => {
  srv = http.createServer((req, res) => {
    let brut = '';
    req.on('data', (c) => { brut += c; });
    req.on('end', () => {
      recu = brut;
      res.writeHead(statut, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(corps));
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  /* Le module lit MAINSTREET_ORIGIN au chargement: il faut le poser AVANT le require. */
  process.env.MAINSTREET_ORIGIN = 'http://127.0.0.1:' + srv.address().port;
  V = require(path.join(RACINE, 'sdk', 'verifier.js'));
});

test.after(() => { if (srv) srv.close(); });

const attestationValide = (extra) => Object.assign({
  address: A, signed: true,
  payload: { version: '1', subjectType: 'agent', subject: SUJET, score: 80,
    timestamp: Math.floor(Date.now() / 1000), operator: V.OPERATOR, nonce: 1 },
  signature: '0x' + '11'.repeat(65),
}, extra);

test('TEMOIN: une attestation complete et signee passe encore', async () => {
  corps = attestationValide();
  const s = await V.requireMinScore(A, 50, viemStub);
  assert.equal(s, 80, 'sans ce temoin, une porte qui refuse TOUT passerait tous les autres tests');
});

test('le domaine EIP-712 est EPINGLE, jamais pris dans l objet verifie', async () => {
  vus.length = 0;
  const etranger = { name: 'UN-AUTRE-PROTOCOLE', version: '9', chainId: 1 };
  const att = attestationValide({ eip712: { domain: etranger, types: { Attestation: [{ name: 'x', type: 'string' }] } } });

  await assert.rejects(() => V.verifyAttestation(att, viemStub), /domain|domaine|EIP-712/i,
    'une attestation qui apporte SON PROPRE domaine doit etre refusee, pas verifiee sous ce domaine');

  /* Et si malgre tout la recuperation a ete appelee, elle ne doit pas avoir vu le domaine etranger. */
  for (const a of vus) {
    assert.notDeepEqual(a.domain, etranger,
      'le domaine fourni par l objet verifie a ete transmis a la recuperation de signature');
  }
});

test('le domaine epingle est bien celui utilise quand l attestation n en apporte pas', async () => {
  vus.length = 0;
  await V.verifyAttestation(attestationValide(), viemStub);
  assert.equal(vus.length, 1, 'accessibilite: la recuperation doit avoir ete appelee');
  assert.deepEqual(vus[0].domain, V.DOMAIN, 'le domaine passe doit etre la constante du module');
  assert.deepEqual(vus[0].types, V.TYPES, 'les types passes doivent etre ceux du module');
});

test('une borne non numerique ne peut pas s ouvrir', async () => {
  const cas = [
    ['payload vide', {}],
    ['sans timestamp ni score', { subject: SUJET, nonce: 1 }],
    ['score sans horodatage', { score: 99, subject: SUJET, nonce: 1 }],
    ['horodatage non numerique', { score: 99, timestamp: 'abc', subject: SUJET, nonce: 1 }],
    ['score undefined explicite', { score: undefined, timestamp: Math.floor(Date.now() / 1000), subject: SUJET, nonce: 1 }],
  ];
  const ouvertes = [];
  for (const [nom, payload] of cas) {
    corps = attestationValide({ payload });
    try {
      const s = await V.requireMinScore(A, 50, viemStub);
      ouvertes.push(nom + ' -> a rendu ' + JSON.stringify(s));
    } catch { /* refuser est le comportement attendu */ }
  }
  assert.deepEqual(ouvertes, [],
    'porte(s) ouverte(s) sur une valeur non numerique:\n  ' + ouvertes.join('\n  ')
    + '\n  NaN > 86400 est FAUX et undefined < 50 est FAUX: une comparaison ne borne rien'
    + ' tant que la valeur n a pas ete prouvee finie.');
});

test('null et undefined sont traites PAREIL', async () => {
  const resultat = async (score) => {
    corps = attestationValide({ payload: { score, timestamp: Math.floor(Date.now() / 1000), subject: SUJET, nonce: 1 } });
    try { return 'rend ' + JSON.stringify(await V.requireMinScore(A, 50, viemStub)); } catch { return 'leve'; }
  };
  const avecNull = await resultat(null);
  const avecUndef = await resultat(undefined);
  assert.equal(avecNull, avecUndef,
    'les deux valeurs « absentes » divergeaient: `null < 50` est VRAI donc attrape, `undefined < 50`'
    + ' est FAUX donc laisse passer. null: ' + avecNull + ' | undefined: ' + avecUndef);
  assert.equal(avecNull, 'leve', 'et les deux doivent REFUSER');
});

test('le refus du serveur est LU, et sa raison est rendue au consommateur', async () => {
  /* Forme REELLE relevee en prod le 2026-08-15: HTTP 200, refus dans le corps. */
  corps = {
    version: '1', address: A, signed: false, score: 91,
    reason: 'score-built-on-incomplete-read',
    detail: 'latest leaderboard row is marked DEGRADED',
    retry: 'The next clean leaderboard build re-scores this address; re-request then.',
    sources: ['x402-bazaar-base', 'DEGRADED:reputation-unreadable'],
  };
  await assert.rejects(() => V.fetchAttestation(A), /score-built-on-incomplete-read/,
    'le serveur DIT `signed:false` avec une raison lisible — la porte doit refuser en la citant,'
    + ' au lieu de rendre ce corps et de mourir plus loin sur un TypeError.');
  await assert.rejects(() => V.requireMinScore(A, 50, viemStub), /score-built-on-incomplete-read/,
    'et la raison doit survivre jusqu au consommateur, qui est celui qui decide de payer');
});

test('CAS OPPOSE: une attestation perimee est toujours refusee', async () => {
  corps = attestationValide({ payload: { score: 99, timestamp: Math.floor(Date.now() / 1000) - 864000, subject: SUJET, nonce: 1 } });
  await assert.rejects(() => V.requireMinScore(A, 50, viemStub), /stale/,
    'la borne de fraicheur qui marchait deja ne doit pas avoir ete perdue');
});

test('la borne de fraicheur ferme les DEUX cotes — un horodatage FUTUR ne passe pas', async () => {
  /* ⛔ `ageSec > 86400` ne refusait que le PERIME. Un timestamp futur donne un age negatif, qui passait
   * — et passera toujours: la fenetre de 24 h, posee pour borner le rejeu, est defaite entierement par
   * une seule attestation signee dans le futur (bug d'horloge du signeur, ou cle compromise). Mesure
   * avant correctif: +1 h dans le futur => resolvait avec le score, sans un mot. */
  corps = attestationValide({ payload: { score: 99, timestamp: Math.floor(Date.now() / 1000) + 3600, subject: SUJET, nonce: 1 } });
  await assert.rejects(() => V.requireMinScore(A, 50, viemStub), /future/,
    'une attestation datee du futur doit etre refusee, pas eternellement fraiche');

  // TEMOIN de tolerance: 60 s de derive d'horloge (deux machines NTP) ne doivent PAS faire battre la porte.
  corps = attestationValide({ payload: { score: 99, timestamp: Math.floor(Date.now() / 1000) + 60, subject: SUJET, nonce: 1 } });
  assert.equal(await V.requireMinScore(A, 50, viemStub), 99,
    'une derive de quelques secondes est du skew, pas une attaque — la refuser rendrait la porte inutilisable');

  // et le cas NOMINAL reste nominal — le correctif n'avale rien.
  corps = attestationValide({ payload: { score: 99, timestamp: Math.floor(Date.now() / 1000), subject: SUJET, nonce: 1 } });
  assert.equal(await V.requireMinScore(A, 50, viemStub), 99);
});

/* ── LE PLANCHER DE L'APPELANT SUIT LA MEME REGLE QUE LES CHAMPS D'EN FACE ──────────────────────────
 * Mesure du 2026-08-16, attestation signee de score 12: `requireMinScore(A, undefined)`, `(A, NaN)`,
 * `(A, 'abc')` et `(A, null)` RENDAIENT 12 sans refus — `12 < undefined` est faux, donc la fonction
 * nommee REQUIRE-min-score n'exigeait rien des qu'on lui passait un plancher illisible. La regle
 * « une comparaison ne borne rien tant que la valeur n'est pas prouvee finie » etait appliquee aux
 * champs de l'ATTESTATION, pas au minScore de l'appelant, une ligne plus loin. Et `buildOnchainCall`
 * defautait a 0: un appel on-chain « n'exiger aucun score », construit par omission. */

test('un plancher ILLISIBLE refuse — la fonction nommee require n exige jamais rien par accident', async () => {
  corps = attestationValide({ payload: { score: 12, timestamp: Math.floor(Date.now() / 1000), subject: SUJET, nonce: 1 } });
  for (const plancher of [undefined, null, NaN, 'abc']) {
    await assert.rejects(() => V.requireMinScore(A, plancher, viemStub), /finite number/,
      'plancher ' + String(plancher) + ': un plancher illisible n est PAS « pas de plancher »');
  }
});

test('TEMOIN: un 0 EXPLICITE reste legal — accepter tout score est un choix qui se dit', async () => {
  corps = attestationValide({ payload: { score: 12, timestamp: Math.floor(Date.now() / 1000), subject: SUJET, nonce: 1 } });
  assert.equal(await V.requireMinScore(A, 0, viemStub), 12);
});

test('buildOnchainCall: SANS plancher explicite il jette — il construisait requireMinScore(0) en silence', () => {
  const att = attestationValide();
  assert.throws(() => V.buildOnchainCall(att), /explicit finite minScore/);
  assert.throws(() => V.buildOnchainCall(att, 'abc'), /explicit finite minScore/);
});

test('buildOnchainCall TEMOIN: un plancher DIT voyage dans les args — premier exercice de cet export', () => {
  /* Le commentaire d'en-tete de ce fichier avouait: « la verification ON-CHAIN (buildOnchainCall),
   * qui n'est pas exercee ici ». Un export expedie sans aucun cas est une promesse sur parole. */
  const att = attestationValide();
  const zero = V.buildOnchainCall(att, 0);
  assert.equal(zero.args[1], 0, 'exiger zero, EXPLICITEMENT, reste possible');
  const call = V.buildOnchainCall(att, 50);
  assert.equal(call.args[1], 50);
  assert.equal(call.functionName, 'requireMinScore');
  assert.ok(/^0x[0-9a-fA-F]{40}$/.test(call.address), 'l adresse du verifier voyage avec l appel');
  assert.equal(call.args[0], SUJET);
});

// ─── verifyServerSide : le TROISIEME frere, ni durci ni teste ────────────────────────────────────
// `requireMinScore` et `buildOnchainCall` ont ete durcis le 2026-08-16 (plancher illisible = refus,
// plancher omis = refus explicite) et testes ci-dessus. `verifyServerSide`, exporte dans le meme
// module et parti dans le meme tarball npm, n'avait AUCUN cas — et gardait le defaut d'origine.
//
// MESURE : `JSON.stringify({minScore: undefined})` rend `{}`. La cle n'est pas envoyee `null`, elle
// N'EST PAS ENVOYEE. Cote serveur, `minScore == null ? true : …` rend alors `passesThreshold: true`
// et un hint qui dit « valid and meets threshold ». Un plancher perdu revient en seuil satisfait.
//
// ⛔ BORNE : ces cas prouvent ce que le SDK ENVOIE et comment il LIT la reponse. Le comportement du
// vrai endpoint est teste dans agent-veille, pas ici.

const reponseServeur = (extra) => Object.assign({
  valid: true, signerMatch: true, ageSec: 5, fresh: true, score: 3,
  passesThreshold: true, minScore: null, hint: 'attestation is valid and meets threshold',
}, extra);

test('TEMOIN: un plancher DIT voyage bien sur le fil, et le verdict revient', async () => {
  corps = reponseServeur({ score: 80, minScore: 50 });
  recu = null;
  const out = await V.verifyServerSide(attestationValide(), { minScore: 50 });
  assert.strictEqual(JSON.parse(recu).minScore, 50, 'sans ce temoin, un corps toujours vide passerait le cas suivant');
  assert.strictEqual(out.valid, true);
  assert.strictEqual(out.thresholdChecked, true, 'un plancher demande doit se dire verifie');
  assert.strictEqual(out.minScoreRequested, 50);
});

test('LE FAIT: un plancher `undefined` DISPARAISSAIT du corps — l absence se dit maintenant', async () => {
  // Le cas reel: une faute de casse (`minscore`) ou une variable restee undefined.
  corps = reponseServeur();                       // le serveur repond « valide, meets threshold »
  recu = null;
  const out = await V.verifyServerSide(attestationValide(), { minscore: 80 });
  assert.ok(!('minScore' in JSON.parse(recu)),
    'la cle ne part pas — c est le fait mesure, et il est INCHANGE: on ne peut pas envoyer un plancher qu on n a pas');
  assert.strictEqual(out.passesThreshold, true, 'le serveur affirme toujours le seuil, et son hint aussi');
  assert.strictEqual(out.thresholdChecked, false,
    'CE QUI CHANGE: le SDK dit qu AUCUN plancher n a ete verifie, la ou le hint dit « meets threshold »');
  assert.strictEqual(out.minScoreRequested, null);
});

test('un plancher ILLISIBLE refuse, comme chez ses deux freres', async () => {
  corps = reponseServeur();
  for (const mauvais of ['abc', NaN, {}, [], '']) {
    await assert.rejects(() => V.verifyServerSide(attestationValide(), { minScore: mauvais }), /is not a number/,
      `minScore ${JSON.stringify(mauvais)} doit refuser, jamais s evaporer`);
  }
});

test('CAS OPPOSE: un 0 EXPLICITE reste legal et VOYAGE — il ne doit pas etre avale comme « absent »', async () => {
  corps = reponseServeur({ minScore: 0 });
  recu = null;
  const out = await V.verifyServerSide(attestationValide(), { minScore: 0 });
  assert.strictEqual(JSON.parse(recu).minScore, 0, 'un test de verite (`if (minScore)`) avalerait ce 0');
  assert.strictEqual(out.thresholdChecked, true, 'exiger zero est un choix qui se dit, pas une omission');
  assert.strictEqual(out.minScoreRequested, 0);
});

test('un statut non-2xx n est pas un verdict', async () => {
  corps = { error: 'boom' };
  for (const code of [400, 402, 404, 500]) {
    statut = code;
    await assert.rejects(() => V.verifyServerSide(attestationValide(), { minScore: 50 }),
      new RegExp(`HTTP ${code}`), `un ${code} revenait tel quel, avec valid=undefined`);
  }
  statut = 200;
});

test('une reponse SANS verdict booleen n est pas lue comme un refus — undefined n est pas false', async () => {
  // Le piege exact: un appelant qui ecrit `if (r.valid === false) refuser` laissait passer un corps
  // d erreur, parce que `undefined === false` est FAUX.
  for (const sansVerdict of [{ error: 'nope' }, { valid: 'true' }, { valid: 1 }, {}]) {
    corps = sansVerdict;
    await assert.rejects(() => V.verifyServerSide(attestationValide(), { minScore: 50 }), /no boolean verdict/);
  }
  corps = reponseServeur();
  const ok = await V.verifyServerSide(attestationValide(), { minScore: 50 });
  assert.strictEqual(ok.valid, true, 'TEMOIN: un vrai booleen passe encore');
});

test('une attestation vide refuse explicitement, au lieu d un TypeError', async () => {
  corps = reponseServeur();
  for (const rien of [null, undefined, {}, { payload: {} }, { signature: '0x11' }]) {
    await assert.rejects(() => V.verifyServerSide(rien, { minScore: 50 }), /nothing to verify/);
  }
});

test('LE TROU PARTAGE PAR LES TROIS FRERES: `Number()` convertit au lieu de valider', async () => {
  /* MESURE du 2026-08-20, decouverte en ecrivant le cas « plancher illisible » ci-dessus — mon
   * temoin a refuse, et c etait le CODE qui avait tort:
   *     Number([]) = 0     Number('') = 0     Number('  ') = 0     Number(true) = 1
   * Le durcissement du 2026-08-16 exigeait « fini ». Un tableau vide est fini: il vaut ZERO. Donc
   * `minScore: []` construisait un plancher de zero — n exiger RIEN — depuis une valeur que
   * personne n a voulue comme zero. Meme motif que le `Number(null) === 0` qui a tue un repli
   * ailleurs dans ce projet: la valeur vide se COMPTE comme un vrai zero. */
  const att = attestationValide();
  const pasDesPlanchers = [[], '', '   ', true, false, [50], {}, null, undefined];
  for (const v of pasDesPlanchers) {
    const q = JSON.stringify(v) ?? String(v);
    await assert.rejects(() => V.requireMinScore(A, v, viemStub), /finite number/, `requireMinScore(${q})`);
    assert.throws(() => V.buildOnchainCall(att, v), /explicit finite minScore/, `buildOnchainCall(${q})`);
    if (v !== null && v !== undefined) {
      await assert.rejects(() => V.verifyServerSide(att, { minScore: v }), /is not a number/, `verifyServerSide(${q})`);
    }
  }
  // TEMOIN DANS LES DEUX SENS: ce qui EST un plancher passe toujours.
  assert.equal(V.buildOnchainCall(att, 0).args[1], 0, 'exiger zero, EXPLICITEMENT, reste legal');
  assert.equal(V.buildOnchainCall(att, '80').args[1], 80,
    'une chaine numerique reste legale — un plancher arrive souvent de JSON ou d une variable d env');
  corps = reponseServeur({ minScore: 80 });
  const out = await V.verifyServerSide(att, { minScore: '80' });
  assert.equal(out.minScoreRequested, 80);
});
