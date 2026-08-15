/**
 * MainStreet verifier helpers — off-chain + on-chain.
 *
 * Off-chain (Node/browser): import { verifyAttestation } from 'mainstreet-oracle/verifier'
 * On-chain: contract at 0x7397adb9713934c36d22aa54b4dbbcd70263592b on Base mainnet.
 */

const VERIFIER_ADDRESS = '0x7397adb9713934c36d22aa54b4dbbcd70263592b';
const OPERATOR = '0xAC3ca7c5d3cDD7702fd08F9C4C28dAA22296aDa9';
const ORIGIN = process.env.MAINSTREET_ORIGIN || 'https://avisradar-production.up.railway.app';

const DOMAIN = { name: 'MainStreet', version: '1', chainId: 8453 };
const TYPES = {
  Attestation: [
    { name: 'version', type: 'string' },
    { name: 'subjectType', type: 'string' },
    { name: 'subject', type: 'bytes32' },
    { name: 'score', type: 'uint8' },
    { name: 'timestamp', type: 'uint64' },
    { name: 'operator', type: 'address' },
    { name: 'nonce', type: 'uint64' },
  ],
};
const VERIFIER_ABI = [
  { name: 'requireMinScore', type: 'function', stateMutability: 'view', inputs: [
    { name: 'subject', type: 'bytes32' }, { name: 'minScore', type: 'uint8' },
    { name: 'score', type: 'uint8' }, { name: 'timestamp', type: 'uint64' },
    { name: 'nonce', type: 'uint64' }, { name: 'signature', type: 'bytes' },
  ], outputs: [{ type: 'bool' }] },
  { name: 'verifiedScore', type: 'function', stateMutability: 'view', inputs: [
    { name: 'subject', type: 'bytes32' }, { name: 'score', type: 'uint8' },
    { name: 'timestamp', type: 'uint64' }, { name: 'nonce', type: 'uint64' },
    { name: 'signature', type: 'bytes' },
  ], outputs: [{ type: 'uint8' }] },
];

/**
 * Fetch the signed attestation for an address.
 * @returns {{address, score, payload, signature, eip712, verifyHints}}
 */
async function fetchAttestation(address) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) throw new Error('invalid address');
  const r = await fetch(`${ORIGIN}/api/agent/attestation/${address.toLowerCase()}`);
  if (!r.ok) throw new Error(`MainStreet API ${r.status}`);
  const body = await r.json();

  /* Le REFUS est dans le corps, pas dans le statut: en prod cette route repond HTTP 200 avec
   * `signed:false`, un `reason` lisible et un `retry`. Ne tester que `r.ok` revenait a prendre un
   * refus explicite pour une attestation. On refuse ici, en citant les mots du serveur. */
  if (body && body.signed === false) {
    throw new Error('MainStreet: attestation not signed — ' + (body.reason || 'no reason given')
      + (body.retry ? ' (' + body.retry + ')' : ''));
  }
  /* Trois etats: le serveur a dit non (ci-dessus), il n'y a rien a verifier (ici), ou on verifie.
   * `signed` ABSENT n'est pas un non: on exige seulement de quoi verifier. */
  if (!body || !body.payload || !body.signature) {
    throw new Error('MainStreet: attestation has no payload or no signature — nothing to verify');
  }
  return body;
}

/**
 * Verify an attestation off-chain via viem.
 * @returns {Promise<boolean>}
 */
/* Deux domaines sont les memes si leurs cles sont les memes et leurs valeurs egales une fois
 * stringifiees (un chainId servi en texte designe la meme chaine). L'ordre des cles n'importe pas. */
function memeDomaine(a, b) {
  if (!a || !b) return false;
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && String(a[k]) === String(b[k]));
}
/* Pour les TYPES l'ordre compte: il entre dans le hash EIP-712. */
const formeTypes = (t) => (t && Array.isArray(t.Attestation))
  ? t.Attestation.map((f) => f.name + ':' + f.type).join(',') : null;

async function verifyAttestation(attestation, viem) {
  if (!viem?.recoverTypedDataAddress) throw new Error('pass viem module: { recoverTypedDataAddress }');
  if (!attestation || !attestation.payload || !attestation.signature) {
    throw new Error('MainStreet: nothing to verify — attestation has no payload or no signature');
  }

  /* ⛔ LE DOMAINE ET LES TYPES SONT EPINGLES. Ils venaient de `attestation.eip712`, c'est-a-dire de
   * l'objet meme qu'on est en train de verifier: une attestation apportant son propre domaine se
   * faisait verifier SOUS CE DOMAINE. Separer les domaines est exactement ce qui empeche une
   * signature faite ailleurs de valoir ici, donc elle ne peut pas etre choisie par le sujet.
   * Un `eip712` fourni qui DIVERGE n'est pas ignore en silence: c'est un desaccord, on refuse. */
  const apporte = attestation.eip712;
  if (apporte && apporte.domain && !memeDomaine(apporte.domain, DOMAIN)) {
    throw new Error('MainStreet: attestation carries a different EIP-712 domain than the pinned one'
      + ' — refusing rather than verifying under a domain the subject chose');
  }
  if (apporte && apporte.types && formeTypes(apporte.types) !== formeTypes(TYPES)) {
    throw new Error('MainStreet: attestation carries different EIP-712 types than the pinned ones');
  }

  const recovered = await viem.recoverTypedDataAddress({
    domain: DOMAIN,
    types: TYPES,
    primaryType: 'Attestation',
    message: attestation.payload,
    signature: attestation.signature,
  });
  return recovered.toLowerCase() === OPERATOR.toLowerCase();
}

/**
 * One-shot trust gate — fetch + verify + check threshold.
 * Throws if score < minScore or attestation is invalid.
 * @returns {Promise<number>} the verified score
 */
async function requireMinScore(address, minScore, viem) {
  const att = await fetchAttestation(address);
  const valid = await verifyAttestation(att, viem);
  if (!valid) throw new Error('MainStreet: attestation signature invalid');
  /* ⛔ UNE COMPARAISON NE BORNE RIEN TANT QUE LA VALEUR N'EST PAS PROUVEE FINIE. `Number(undefined)`
   * et `Number('abc')` valent NaN, et `NaN > 86400` est FAUX: la garde de fraicheur echouait
   * OUVERTE. De meme `undefined < minScore` est FAUX la ou `null < minScore` est VRAI — les deux
   * valeurs « absentes » se comportaient a l'OPPOSE dans la meme comparaison, et seule l'une des
   * deux etait attrapee. On exige donc la presence PUIS la finitude, avant de comparer. */
  const finiOuRefus = (v, quoi) => {
    if (v === null || v === undefined) throw new Error(`MainStreet: attestation carries no ${quoi}`);
    const n = Number(v);
    if (!Number.isFinite(n)) throw new Error(`MainStreet: attestation ${quoi} is not a number`);
    return n;
  };

  const ageSec = Math.floor(Date.now() / 1000) - finiOuRefus(att.payload.timestamp, 'timestamp');
  /* ⛔ LA BORNE NE FERMAIT QU'UN COTE. `ageSec > 86400` refuse le perime; un horodatage FUTUR donne un
   * age negatif et passait — et passera TOUJOURS: la fenetre de 24 h, qui existe pour borner le rejeu,
   * est defaite entierement par un seul timestamp signe dans le futur. La signature couvre le payload,
   * donc seul l'operateur peut en produire un — mais une attestation eternellement fraiche emise par
   * bug d'horloge ou par compromission de la cle est exactement ce qu'une borne de fraicheur doit
   * empecher de survivre. 300 s de tolerance: deux machines NTP derivent de secondes, pas de minutes;
   * refuser tout negatif ferait battre la porte au moindre ecart d'horloge. */
  if (ageSec < -300) throw new Error('MainStreet: attestation timestamp is in the future');
  if (ageSec > 86400) throw new Error('MainStreet: attestation stale (>24h)');
  const score = finiOuRefus(att.payload.score, 'score');
  if (score < minScore) throw new Error(`MainStreet: score ${score} < ${minScore}`);
  return score;
}

/**
 * Server-side verification via the /verify endpoint (zero crypto deps).
 * @returns {Promise<{valid: boolean, score: number, hint: string}>}
 */
async function verifyServerSide(attestation, options = {}) {
  const r = await fetch(`${ORIGIN}/api/agent/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload: attestation.payload, signature: attestation.signature, minScore: options.minScore }),
  });
  return r.json();
}

/**
 * Build the on-chain transaction calldata to verify an attestation.
 * Use with viem.writeContract() or ethers.Contract.requireMinScore().
 */
function buildOnchainCall(attestation, minScore = 0) {
  return {
    address: VERIFIER_ADDRESS,
    abi: VERIFIER_ABI,
    functionName: 'requireMinScore',
    args: [
      attestation.payload.subject,
      Number(minScore),
      attestation.payload.score,
      BigInt(attestation.payload.timestamp),
      BigInt(attestation.payload.nonce),
      attestation.signature,
    ],
  };
}

module.exports = {
  VERIFIER_ADDRESS,
  OPERATOR,
  DOMAIN,
  TYPES,
  VERIFIER_ABI,
  fetchAttestation,
  verifyAttestation,
  requireMinScore,
  verifyServerSide,
  buildOnchainCall,
};
