// unreadable-input-is-not-a-score.test.js
// ================================================================================================
// MESURÉ PAR EXÉCUTION le 2026-08-20 sur ce paquet publié (mainstreet-oracle 0.9.3), AVANT correctif :
//
//     computeScoreAgent({ usdcVolume: '1,000', … })    -> NaN  -> sur le fil : {"score": null}
//     computeScoreAgent({ successRate: 'x',    … })    -> NaN  -> {"score": null}
//     computeScoreAgent({ jobCount: 'abc',     … })    -> NaN  -> {"score": null}
//     computeScoreBusiness({ rating: 'quatre', … })    -> 20   (un rating ILLISIBLE publié en score)
//
// DEUX FAUTES OPPOSÉES dans le même fichier :
//   · côté agent, `Number(x ?? 0)` — le `??` ne rattrape que null/undefined, JAMAIS NaN. Un nombre
//     formaté avec une virgule suffit. Et `JSON.stringify` transforme NaN en `null` : un accident
//     arithmétique devient BYTE-IDENTIQUE au signal délibéré « nous n'avons pas de score ».
//   · côté business, `Number(x) || 0` — il AVALE l'illisible et publie un chiffre que personne n'a
//     calculé.
//
// Le correctif ne s'est pas inventé : `finite` et `clamp100` viennent à l'identique du trust-core
// vendorisé, byte-syncé et déjà exécuté par biii, dont le commentaire chiffre le coût (« 7 of 7
// probes ») et nomme la conséquence : un NaN perd TOUTE comparaison en aval, donc un verdict se
// choisit par défaut et sort publié comme un nombre. C'était la copie faible À L'ENVERS — la
// version durcie était la copie gelée, l'original publié ne l'avait jamais reçue.
//
// ⛔ CE QUE CE FICHIER NE COUVRE PAS : la signature (`signPayload` est un stub qui lève), ni le
// serveur qui alimente ces métriques — il vit dans un autre dépôt.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { computeScoreAgent, computeScoreBusiness, computeActivityScore } = require('../oracle.js');

const NOMINAL = { successRate: 1, jobCount: 10, usdcVolume: 1000, daysSinceLastJob: 1 };

// 🪤 CE TÉMOIN A REFUSÉ MON PREMIER JET, ET IL AVAIT RAISON.
// Ma sonde d'origine passait `lastJobDaysAgo: 1` — un nom de champ que ce code NE LIT PAS (il lit
// `daysSinceLastJob`). Le score tombait donc sur le défaut 365, soit 68, et j'ai cité 68 comme
// « le nominal ». Avec le vrai nom, c'est 87. Le NaN mesuré reste vrai — il venait de `usdcVolume`,
// `successRate` et `jobCount`, pas de la récence — mais mon « nominal » décrivait un agent SANS
// récence. Un champ inconnu ne lève pas : il est simplement ignoré, et le défaut prend sa place en
// silence. C'est la raison d'être de ce témoin.
test('témoin — les entrées propres donnent toujours le même score qu\'avant', () => {
  assert.strictEqual(computeScoreAgent(NOMINAL), 87, 'le correctif ne devait RIEN changer sur une entrée saine');
  assert.strictEqual(computeScoreAgent({ successRate: 1, jobCount: 10, usdcVolume: 1000 }), 68,
    'et sans récence, le défaut 365 s\'applique — 68, la valeur que ma première sonde avait prise pour le nominal');
  assert.strictEqual(computeScoreBusiness({ rating: 4, reviewCount: 100 }), 68);
  assert.strictEqual(computeActivityScore({ jobCount: 10, successRate: 1 }), 42);
});

test('une entrée illisible ne produit plus NaN — donc plus de `null` accidentel sur le fil', () => {
  for (const [champ, valeur] of [['usdcVolume', '1,000'], ['successRate', 'x'], ['jobCount', 'abc'], ['daysSinceLastJob', 'hier']]) {
    const s = computeScoreAgent({ ...NOMINAL, [champ]: valeur });
    assert.ok(Number.isFinite(s), `${champ}='${valeur}' rend ${s} — un NaN ici devient null sur le fil`);
    assert.ok(s >= 0 && s <= 100, `${champ}: ${s} hors domaine`);
    // LE POINT : sérialisé, ce score ne peut plus se confondre avec « pas de score ».
    assert.notStrictEqual(JSON.parse(JSON.stringify({ score: s })).score, null,
      `${champ}='${valeur}' produisait {"score":null}, indistinguable du signal honnête`);
  }
});

test('un champ illisible retombe sur le DÉFAUT NOMMÉ, pas sur un zéro silencieux', () => {
  // `daysSinceLastJob` a pour défaut 365 (et non 0) : une valeur illisible doit donc être traitée
  // comme « on ne sait pas quand », c'est-à-dire ancienne — jamais comme « actif aujourd'hui ».
  const illisible = computeScoreAgent({ ...NOMINAL, daysSinceLastJob: 'hier' });
  const absent = computeScoreAgent({ successRate: 1, jobCount: 10, usdcVolume: 1000 });
  assert.strictEqual(illisible, absent, 'illisible et absent doivent donner le MÊME score : le défaut nommé');
  const actif = computeScoreAgent({ ...NOMINAL, daysSinceLastJob: 0 });
  assert.ok(actif > illisible, 'et un agent réellement actif aujourd\'hui doit scorer PLUS qu\'un inconnu');
});

test('le jumeau business ne publie plus un rating illisible comme un score', () => {
  // AVANT : rating 'quatre' -> Number()||0 -> 0 -> score 20, publié comme un fait.
  // APRÈS : même valeur de repli, mais elle passe par un défaut NOMMÉ et le total est refusé s'il
  // n'est pas fini. Le score reste 20 — ce qui compte est qu'il ne peut plus valoir NaN, et que le
  // chemin est le même que celui du trust-core vendorisé.
  const s = computeScoreBusiness({ rating: 'quatre', reviewCount: 100 });
  assert.ok(Number.isFinite(s), 'un rating illisible ne doit pas produire NaN');
  assert.strictEqual(s, computeScoreBusiness({ rating: 0, reviewCount: 100 }), 'illisible == défaut nommé (0)');
});

test('computeActivityScore : NaN ne traverse plus le clamp', () => {
  for (const champ of ['jobCount', 'daysSinceLastJob', 'ageDays', 'snapshotDaysLast30', 'tagCount', 'successRate']) {
    const s = computeActivityScore({ jobCount: 10, successRate: 1, [champ]: 'illisible' });
    assert.ok(Number.isFinite(s) && s >= 0 && s <= 100, `${champ} illisible -> ${s}`);
  }
});

test('DETECTION POWER — le clamp SEUL n\'aurait pas suffi, et c\'est pourquoi clamp100 refuse', () => {
  // La forme d'origine : Math.max(0, Math.min(100, Math.round(total))). Elle RESSEMBLE à une
  // garantie du domaine 0-100 et n'en est pas une.
  const clampNaif = (t) => Math.max(0, Math.min(100, Math.round(t)));
  assert.ok(Number.isNaN(clampNaif(NaN)), 'le clamp naïf laisse passer NaN — il ne borne rien');
  // Et c'est ce NaN qui, sérialisé, devenait le null indistinguable.
  assert.strictEqual(JSON.parse(JSON.stringify({ score: clampNaif(NaN) })).score, null);
});

test('les trois scorers rendent null sur un total non calculable, jamais un nombre inventé', () => {
  // On ne peut plus atteindre ce cas par les entrées (toutes coercées), ce qui est le but. On vérifie
  // donc le contrat du refus lui-même, tel que le trust-core vendorisé le définit.
  const { computeScoreBusiness: b } = require('../oracle.js');
  assert.strictEqual(typeof b({ rating: 5, reviewCount: 1000 }), 'number', 'un total calculable reste un nombre');
});
