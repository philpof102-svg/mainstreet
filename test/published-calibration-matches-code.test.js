// published-calibration-matches-code.test.js
// ================================================================================================
// Le tableau « Calibration » est publié sur TROIS surfaces — README.md, SPEC.md et index.html —
// et il annonce ce que le scoring de ce paquet PRODUIT. Deux de ses six lignes annonçaient un
// chiffre que le code ne calcule plus.
//
// MESURÉ PAR EXÉCUTION le 2026-08-20, avec les VRAIS noms de champs :
//
//     Top-tier (99 %, 500 jobs, 50 k$, active TODAY)   publié 78   calculé 98
//     Newbie   (100 %,  2 jobs,   50 $, active TODAY)  publié 20   calculé 40
//     (les quatre autres lignes : exactes)
//
// LES DEUX LIGNES FAUSSES SONT EXACTEMENT LES DEUX QUI DISENT « active today », et chacune vaut
// précisément le score obtenu en NE PASSANT PAS la récence — c'est-à-dire avec le défaut nommé 365,
// « on ne sait pas quand ».
//
// L'HISTOIRE, VÉRIFIÉE EN EXÉCUTANT L'ORACLE D'ORIGINE (`git show e0d2811:oracle.js`) :
//   · à `e0d2811`, le tableau était JUSTE 6/6 — le code lisait `Number(x) || 365`, donc
//     `daysSinceLastJob: 0` (actif aujourd'hui) était avalé et devenait 365 ;
//   · `424929a` a corrigé exactement ça — son message le dit : « daysSinceLastJob=0 was being
//     treated as missing » ;
//   · le tableau, lui, n'a jamais été recalculé. UN CORRECTIF QUI NE VISITE PAS SES TÉMOINS.
//
// POURQUOI LES TESTS EXISTANTS N'ONT RIEN VU :
//   · `agent: top-tier (Ethy-like) >= 75` — une assertion de PLAGE ne détecte aucune dérive À
//     L'INTÉRIEUR de sa plage : 78 et 98 la satisfont tous les deux ;
//   · `agent: newbie (small sample, active today) ~ 40` — celui-là CONNAÎT la valeur 40, avec
//     quatre lignes de commentaire qui l'expliquent. Il CONTREDIT le README publié depuis
//     `424929a`, dans le même dépôt, et personne n'a fait le rapprochement.
//   · `examples/basic-usage.js`, publié dans le MÊME tarball npm, imprime 98 et 40.
//
// CE QUE CE GATE FAIT : il relit les trois fichiers PUBLIÉS, en extrait le chiffre annoncé, et le
// recalcule par les vraies fonctions. Il vérifie aussi que la PROSE de chaque ligne porte encore
// les entrées que ce fichier lui prête — sinon quelqu'un pourrait changer le profil décrit et le
// gate comparerait en silence à des entrées périmées.
//
// ⛔ BORNE : ce gate prouve que le tableau publié est cohérent avec le code de CE dépôt. Il ne dit
// rien de la calibration elle-même (les seuils sont une décision produit), ni du paquet DÉJÀ publié
// sur npm, ni de la page déjà déployée.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { computeScoreAgent, computeScoreBusiness } = require('../oracle.js');

const lire = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

// Les six profils du tableau. `calc` passe les entrées au VRAI scorer ; `jetons` sont les fragments
// de prose qui doivent rester présents dans la ligne, par fichier — c'est ce qui empêche ce gate de
// comparer à un profil que la doc ne décrit plus.
const PROFILS = [
  {
    nom: 'Top-tier agent, actif aujourd\'hui',
    calc: () => computeScoreAgent({ successRate: 0.99, jobCount: 500, usdcVolume: 50000, daysSinceLastJob: 0 }),
    surfaces: {
      'README.md': { cle: 'Top-tier agent (Ethy-like', jetons: ['99% success', '500 jobs', '$50k vol', 'active today'] },
      'SPEC.md': { cle: 'Top agent (Ethy-like', jetons: ['99% success', '500 jobs', '$50k vol', 'active today'] },
      'index.html': { cle: 'Top tier (Ethy-like)', jetons: ['99%', '500', '$50&nbsp;000', 'today'] },
    },
  },
  {
    nom: 'Mid-tier actif, 3 jours',
    calc: () => computeScoreAgent({ successRate: 0.85, jobCount: 50, usdcVolume: 3000, daysSinceLastJob: 3 }),
    surfaces: {
      'README.md': { cle: 'Mid-tier active', jetons: ['85% success', '50 jobs', '$3k vol', '3d ago'] },
      'SPEC.md': { cle: 'Mid agent (85% success', jetons: ['85% success', '50 jobs', '$3k vol', '3d ago'] },
      'index.html': { cle: 'Mid-tier active', jetons: ['85%', '50', '$3&nbsp;000', '3d'] },
    },
  },
  {
    nom: 'Newbie agent, actif aujourd\'hui',
    calc: () => computeScoreAgent({ successRate: 1, jobCount: 2, usdcVolume: 50, daysSinceLastJob: 0 }),
    surfaces: {
      'README.md': { cle: 'Newbie agent (100% success', jetons: ['100% success', '2 jobs', '$50 vol', 'today'] },
      'SPEC.md': { cle: 'Newbie agent (100% success', jetons: ['100% success', '2 jobs', '$50 vol', 'today'] },
      'index.html': { cle: 'Newbie (small sample)', jetons: ['100%', '$50', 'today'] },
    },
  },
  {
    nom: 'Ghost agent, dormant 60 jours',
    calc: () => computeScoreAgent({ successRate: 0.90, jobCount: 100, usdcVolume: 10000, daysSinceLastJob: 60 }),
    surfaces: {
      'README.md': { cle: 'Ghost agent (90% success', jetons: ['90% success', '100 jobs', '$10k vol', 'dormant 60d'] },
      'SPEC.md': { cle: 'Ghost agent (90% success', jetons: ['90% success', '100 jobs', '$10k vol', 'dormant 60d'] },
      'index.html': { cle: 'Ghost (dormant)', jetons: ['90%', '100', '$10&nbsp;000', '60d'] },
    },
  },
  {
    nom: 'Commerce mature',
    calc: () => computeScoreBusiness({ rating: 4.5, reviewCount: 2000 }),
    surfaces: {
      'README.md': { cle: 'Mature high-rated commerce', jetons: ['4.5', '2k reviews'] },
      'SPEC.md': { cle: 'Mature high-rated commerce', jetons: ['4.5', '2k reviews'] },
    },
  },
  {
    nom: 'Commerce newbie',
    calc: () => computeScoreBusiness({ rating: 5, reviewCount: 3 }),
    surfaces: {
      'README.md': { cle: 'Newbie commerce', jetons: ['3 reviews'] },
      'SPEC.md': { cle: 'Newbie commerce', jetons: ['3 reviews'] },
    },
  },
];

// Extrait le DERNIER nombre de la ligne : `| … | 98 |` en markdown, `…<td>98</td>` en HTML.
function scoreAnnonce(ligne, fichier) {
  const m = fichier.endsWith('.html')
    ? [...ligne.matchAll(/<td>(\d+)<\/td>/g)]
    : [...ligne.matchAll(/\|\s*(\d+)\s*\|/g)];
  return m.length ? Number(m[m.length - 1][1]) : null;
}

function ligneDe(fichier, cle) {
  const lignes = lire(fichier).split(/\r?\n/).filter((l) => l.includes(cle));
  assert.strictEqual(lignes.length, 1,
    `${fichier} : ${lignes.length} ligne(s) contiennent « ${cle} » — il en faut exactement une`);
  return lignes[0];
}

test('temoin — l extracteur lit bien un chiffre, et sait dire qu il n y en a pas', () => {
  assert.strictEqual(scoreAnnonce('| Un profil quelconque | 42 |', 'README.md'), 42);
  assert.strictEqual(scoreAnnonce('<tr><td>X</td><td>7</td><td>98</td></tr>', 'index.html'), 98,
    'en HTML c\'est le DERNIER td qui porte le score');
  assert.strictEqual(scoreAnnonce('| pas de chiffre ici |', 'README.md'), null,
    'et une ligne sans chiffre ne doit pas rendre 0 — sinon un tableau vide passerait');
  assert.strictEqual(scoreAnnonce('<td>rien</td>', 'index.html'), null);
});

for (const profil of PROFILS) {
  for (const [fichier, { cle, jetons }] of Object.entries(profil.surfaces)) {
    test(`${fichier} — « ${profil.nom} » annonce ce que le code calcule`, () => {
      const ligne = ligneDe(fichier, cle);
      for (const j of jetons) {
        assert.ok(ligne.includes(j),
          `${fichier} : la ligne ne dit plus « ${j} » — le profil décrit a changé, ce gate compare donc à des entrées périmées`);
      }
      const annonce = scoreAnnonce(ligne, fichier);
      assert.notStrictEqual(annonce, null, `${fichier} : aucun score lisible sur la ligne « ${cle} »`);
      assert.strictEqual(annonce, profil.calc(),
        `${fichier} annonce ${annonce} là où le code calcule ${profil.calc()} — un chiffre publié qui a cessé d'être vrai`);
    });
  }
}

test('LA CAUSE : les deux lignes « active today » valaient le score SANS recence', () => {
  // Ce cas ne garde pas le tableau : il garde la LEÇON, pour que la prochaine dérive soit lisible.
  const avecRecence = computeScoreAgent({ successRate: 0.99, jobCount: 500, usdcVolume: 50000, daysSinceLastJob: 0 });
  const sansRecence = computeScoreAgent({ successRate: 0.99, jobCount: 500, usdcVolume: 50000 });
  assert.strictEqual(sansRecence, 78, 'omettre la récence rend exactement le 78 qui était publié');
  assert.strictEqual(avecRecence, 98, 'la passer rend 98');
  assert.strictEqual(avecRecence - sansRecence, 20, 'l\'écart est le terme de récence entier — 20 points');
  // Le défaut est NOMMÉ (365 = « on ne sait pas quand »), jamais 0 : un champ absent ne doit pas
  // se lire « actif aujourd'hui ». C'est ce qui rend l'omission silencieuse ET conservatrice.
  assert.strictEqual(sansRecence, computeScoreAgent({ successRate: 0.99, jobCount: 500, usdcVolume: 50000, daysSinceLastJob: 365 }));
});

test('l exemple publie dans le meme tarball reste d accord avec le tableau', () => {
  // `examples/basic-usage.js` imprimait 98 et 40 pendant que le README annonçait 78 et 20 — les deux
  // dans le MÊME paquet npm. Ce cas empêche les deux surfaces de diverger à nouveau.
  const src = lire('examples/basic-usage.js');
  const bloc = /const topAgent = \{[\s\S]*?daysSinceLastJob: (\d+),/.exec(src);
  assert.ok(bloc, 'le profil top-tier de l\'exemple doit rester lisible');
  assert.strictEqual(Number(bloc[1]), 0, 'l\'exemple décrit bien un agent actif aujourd\'hui');
});
