// Compile ../mainstreet/contracts/Main.sol -> bytecode + abi.
// Output: scripts/main-token.compiled.json
const fs = require('fs');
const path = require('path');
const solc = require('solc');

const SOURCE_PATH = path.join(__dirname, '..', '..', 'mainstreet', 'contracts', 'Main.sol');
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
