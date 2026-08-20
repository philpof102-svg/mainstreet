// vet-absence-is-not-a-pass.test.js
// ================================================================================================
// `sdk/tools.js` vend `mainstreet_vet` comme « minimum reputation + alive gate BEFORE paying it ».
// MESURÉ le 2026-08-20 par EXÉCUTION (fetch stubbé, aucun réseau) : avec `requireAlive: true`,
// un sujet dont `health` était ABSENT, `null`, ou `{}` recevait « safe to use ».
//
//     health.alive = false ... refusé     ← testé
//     health.alive = true .... accepté    ← testé
//     health ABSENT .......... ACCEPTÉ    ← LE TROISIÈME ÉTAT, sans test
//
// Un paramètre nommé `require…` ne peut pas être satisfait par une absence. C'est le jumeau exact
// du défaut corrigé le 2026-08-16 sur `requireMinScore` (« an absent or unreadable floor is NOT
// "no floor" ») : le correctif d'alors ne l'avait pas traversé.
//
// ⛔ BORNE : ce fichier teste la GARDE du client, pas la fraîcheur de la sonde. Un `alive: true`
// vieux de six mois passe encore — c'est une autre question, et elle n'est pas tranchée ici.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const ms = require('../sdk/index.js');

const ADR = '0x' + 'a'.repeat(40);
const repond = (corps) => { global.fetch = async () => ({ ok: true, status: 200, json: async () => corps, text: async () => JSON.stringify(corps) }); };
const SAIN = { score: 90, resourcePath: '/x' };

test('vet: les deux états DÉJÀ testés ne bougent pas', async () => {
  repond({ ...SAIN, health: { alive: false } });
  await assert.rejects(() => ms.vet(ADR), /endpoint unreachable/);
  repond({ ...SAIN, health: { alive: true } });
  const d = await ms.vet(ADR);
  assert.strictEqual(d.score, 90, 'un endpoint vivant et bien noté passe, comme avant');
});

test('vet: une ABSENCE de sonde ne satisfait pas requireAlive', async () => {
  for (const [nom, health] of [['absent', undefined], ['null', null], ['objet vide', {}], ['alive non booléen', { alive: 'yes' }]]) {
    repond({ ...SAIN, ...(health === undefined ? {} : { health }) });
    await assert.rejects(() => ms.vet(ADR, { requireAlive: true }), /liveness unknown/,
      `health ${nom} : la garde doit refuser, pas rendre « safe to use »`);
  }
});

test('vet: on peut accepter un endpoint non sondé, mais DÉLIBÉRÉMENT', async () => {
  repond({ ...SAIN });
  const d = await ms.vet(ADR, { requireAlive: false });
  assert.strictEqual(d.score, 90, 'requireAlive:false est le chemin explicite pour accepter l\'inconnu');
});

test('vet: un score ABSENT n\'est pas un score BAS', async () => {
  // Les deux refusent — mais pas avec les mêmes mots : on RÉESSAIE une panne, on n'insiste pas
  // sur un mauvais score. Le README interdit de traiter une panne de source comme un signal.
  repond({ resourcePath: '/x', health: { alive: true } });
  await assert.rejects(() => ms.vet(ADR), /score unavailable/, 'score absent ⇒ dit que le trou est le NÔTRE');
  repond({ score: null, resourcePath: '/x', health: { alive: true } });
  await assert.rejects(() => ms.vet(ADR), /score unavailable/, 'score null ⇒ idem, pas « null < 30 »');
  repond({ score: NaN, resourcePath: '/x', health: { alive: true } });
  await assert.rejects(() => ms.vet(ADR), /score unavailable/, 'NaN non plus — il traverse toute comparaison');
  repond({ score: 10, resourcePath: '/x', health: { alive: true } });
  await assert.rejects(() => ms.vet(ADR), /score 10 < 30/, 'un score BAS garde son message de verdict');
});

test('vet: l\'ordre des gardes ne masque pas une panne derrière un verdict', async () => {
  // Un sujet sans score ET sans sonde doit parler de son score d'abord (c'est la première garde),
  // mais surtout ne jamais passer.
  repond({ resourcePath: '/x' });
  await assert.rejects(() => ms.vet(ADR), /score unavailable|liveness unknown/);
});
