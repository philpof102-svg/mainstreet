#!/usr/bin/env node
/**
 * MainStreet MCP server (stdio transport).
 *
 * Exposes the MainStreet reputation oracle as a Model Context Protocol
 * server. Any Claude Desktop / Claude Code / agent SDK that speaks MCP
 * can attach this and query agent reputation as a tool.
 *
 * Install (Claude Desktop ~/.claude/config.json):
 *   {
 *     "mcpServers": {
 *       "mainstreet": {
 *         "command": "npx",
 *         "args": ["-y", "@raskhaaa/mainstreet-oracle", "mcp"]
 *       }
 *     }
 *   }
 *
 * Or directly: node scripts/mcp-server.js
 *
 * No deps beyond Node 20+ (native JSON-RPC over stdio).
 */

const ORIGIN = process.env.MAINSTREET_ORIGIN || 'https://avisradar-production.up.railway.app';
const SERVER_NAME = 'mainstreet';
const SERVER_VERSION = '0.4.0';

const TOOLS = [
  {
    name: 'mainstreet_score',
    description: 'Get the MainStreet reputation score (0-100) for an onchain AI agent on Base. Aggregates x402 Bazaar activity, ERC-8004 feedback, live endpoint health.',
    inputSchema: {
      type: 'object',
      properties: { address: { type: 'string', description: 'Ethereum address, 0x + 40 hex chars' } },
      required: ['address'],
    },
  },
  {
    name: 'mainstreet_leaderboard',
    description: 'Top N onchain AI agents on Base ranked by MainStreet score. Default 10.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
        network: { type: 'string', description: 'base | solana | all', default: 'base' },
      },
    },
  },
  {
    name: 'mainstreet_compare',
    description: 'Head-to-head comparison of two onchain agents. Returns winner + margin + recommendation.',
    inputSchema: {
      type: 'object',
      properties: {
        a: { type: 'string', description: 'first agent address' },
        b: { type: 'string', description: 'second agent address' },
      },
      required: ['a', 'b'],
    },
  },
  {
    name: 'mainstreet_search',
    description: 'Search agents by description, address, or tag. Useful for "find me an agent that does X".',
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', minLength: 2 },
        limit: { type: 'integer', default: 10 },
      },
      required: ['q'],
    },
  },
  {
    name: 'mainstreet_recommend',
    description: 'Get agents similar to a given address (same category + nearby score). Useful for fallback routing.',
    inputSchema: {
      type: 'object',
      properties: {
        for: { type: 'string', description: 'reference agent address' },
        limit: { type: 'integer', default: 5 },
      },
      required: ['for'],
    },
  },
  {
    name: 'mainstreet_history',
    description: 'Score time series for an agent (daily snapshots).',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string' },
        days: { type: 'integer', minimum: 1, maximum: 90, default: 30 },
      },
      required: ['address'],
    },
  },
];

async function callApi(path) {
  const r = await fetch(ORIGIN + path);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function execTool(name, args) {
  switch (name) {
    case 'mainstreet_score':
      return await callApi('/api/agent/score/' + args.address);
    case 'mainstreet_leaderboard': {
      const params = new URLSearchParams();
      if (args.limit) params.set('limit', args.limit);
      if (args.network) params.set('network', args.network);
      return await callApi('/api/agent/leaderboard?' + params);
    }
    case 'mainstreet_compare':
      return await callApi(`/api/agent/compare?a=${args.a}&b=${args.b}`);
    case 'mainstreet_search':
      return await callApi(`/api/agent/search?q=${encodeURIComponent(args.q)}&limit=${args.limit || 10}`);
    case 'mainstreet_recommend':
      return await callApi(`/api/agent/recommend?for=${args.for}&limit=${args.limit || 5}`);
    case 'mainstreet_history':
      return await callApi(`/api/agent/history/${args.address}?days=${args.days || 30}`);
    default:
      throw new Error('unknown tool: ' + name);
  }
}

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

// Minimal JSON-RPC 2.0 over stdio (MCP spec)
async function handle(req) {
  const { id, method, params } = req;
  try {
    if (method === 'initialize') {
      return { jsonrpc: '2.0', id, result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      } };
    }
    if (method === 'tools/list') {
      return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
    }
    if (method === 'tools/call') {
      const result = await execTool(params.name, params.arguments || {});
      return { jsonrpc: '2.0', id, result: {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      } };
    }
    if (method === 'notifications/initialized') return null;
    return { jsonrpc: '2.0', id, error: { code: -32601, message: 'method not found: ' + method } };
  } catch (e) {
    return { jsonrpc: '2.0', id, error: { code: -32000, message: e.message } };
  }
}

let buffer = '';
process.stdin.on('data', async (chunk) => {
  buffer += chunk.toString('utf8');
  let idx;
  while ((idx = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    let req;
    try { req = JSON.parse(line); } catch { continue; }
    const resp = await handle(req);
    if (resp) send(resp);
  }
});

// Log to stderr so MCP host (Claude Desktop) doesn't mix with stdout
process.stderr.write(`[MainStreet MCP] server ready, ${TOOLS.length} tools available, origin=${ORIGIN}\n`);
