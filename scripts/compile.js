// Compile ../mainstreet/contracts/Main.sol -> bytecode + abi.
// Output: scripts/main-token.compiled.json
const fs = require('fs');
const path = require('path');
const solc = require('solc');

// ⚠️ CHEMIN RELATIF AU DEPOT, PAS A SON NOM DE DOSSIER. `__dirname` est `<repo>/scripts`, donc le
// contrat vit a `../contracts/Main.sol`. L'ancien chemin remontait DEUX niveaux puis redescendait dans
// un dossier litteralement nomme `mainstreet` — ca ne resout qu'en checkout canonique. Un « Download
// ZIP » de GitHub donne `mainstreet-main/`, un `git clone <url> ms` donne `ms/`: dans les deux cas
// l'ancien chemin SORT du depot et vise un dossier voisin qui n'existe pas. Mesure du 2026-08-15: les
// deux formes resolvent au MEME fichier quand le dossier s'appelle `mainstreet`, la nouvelle survit au
// renommage. (`scripts/compile.js` part dans le tarball, donc le chemin doit tenir hors de ce checkout.)
const SOURCE_PATH = path.join(__dirname, '..', 'contracts', 'Main.sol');
const OUT_PATH = path.join(__dirname, 'main-token.compiled.json');

const source = fs.readFileSync(SOURCE_PATH, 'utf8');

const input = {
  language: 'Solidity',
  sources: { 'Main.sol': { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'] } },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  for (const err of output.errors) {
    if (err.severity === 'error') {
      console.error(err.formattedMessage);
      process.exit(1);
    }
    console.warn(err.formattedMessage);
  }
}

const contract = output.contracts['Main.sol'].Main;
const compiled = {
  contractName: 'Main',
  source,
  abi: contract.abi,
  bytecode: '0x' + contract.evm.bytecode.object,
  deployedBytecode: '0x' + contract.evm.deployedBytecode.object,
  compiler: { version: solc.version(), optimizer: { enabled: true, runs: 200 } },
};

fs.writeFileSync(OUT_PATH, JSON.stringify(compiled, null, 2));
console.log('compiled →', OUT_PATH);
console.log('bytecode size:', (compiled.bytecode.length / 2 - 1), 'bytes');
console.log('abi entries:', compiled.abi.length);
