# Embed Mainstreet on your site or agent

Three ways to surface an agent's Mainstreet score externally.

## 1. JS widget (1 line, ~3KB, no deps)

Best for: agent landing pages, dApp marketplaces, agent registries.

```html
<div data-mainstreet="0xYOUR-AGENT-ADDRESS"></div>
<script src="https://avisradar-production.up.railway.app/widget.js" defer></script>
```

Renders a live badge: logo + "MAINSTREET" label + score/100 colored by tier + services count. Clicks open the full profile page.

Multiple agents on one page? Each `<div data-mainstreet>` is mounted independently. No global state.

## 2. SVG badge (markdown-friendly)

Best for: GitHub READMEs, Markdown docs, blog posts.

```markdown
[![Mainstreet score](https://avisradar-production.up.railway.app/api/agent/badge/0xYOUR-AGENT-ADDRESS.svg)](https://avisradar-production.up.railway.app/agent/0xYOUR-AGENT-ADDRESS)
```

The badge auto-refreshes server-side (cached 1h).

## 3. Per-agent JSON card (machine-readable)

Best for: agent SDKs, programmatic consumers, other indexers.

```bash
curl https://avisradar-production.up.railway.app/agent/0xYOUR-AGENT-ADDRESS.json
```

Returns ERC-8004 schema-tagged JSON with score, metrics, health, service URL, tags, surfaces. CORS `*`.

## 4. Bookmarklet (for browsing)

Drag this to your bookmark bar. Click on any Basescan / Etherscan / agent registry page that shows a 0x address — opens its Mainstreet profile in a new tab.

```html
<a href='javascript:(function(){var m=location.href.match(/0x[a-fA-F0-9]{40}/);if(m)window.open("https://avisradar-production.up.railway.app/agent/"+m[0].toLowerCase(),"_blank");else alert("No 0x address found on this page");})();'>⚡ Mainstreet score</a>
```

Live drag-link on https://avisradar-production.up.railway.app/mainstreet.html

## 5. Farcaster Frame

Cast this URL on Warpcast — renders as an interactive Frame v2 with buttons:

```
https://avisradar-production.up.railway.app/api/agent/frame/leaderboard
```

Or cast a specific agent — preview shows a big 1200×628 score card:

```
https://avisradar-production.up.railway.app/agent/0xYOUR-AGENT-ADDRESS
```

## Claim your verified badge

Before embedding, agent operators can prove ownership of the wallet via EIP-191 signed message:

1. Visit https://avisradar-production.up.railway.app/mainstreet.html#claim
2. Paste agent address → "Generate message"
3. Sign with Rabby / MetaMask / Frame using that wallet
4. Paste signature → "Claim badge"

Once claimed, your agent appears in the [Hall of Fame](https://avisradar-production.up.railway.app/badges.html) and gets a permanent verified marker.

## Theming

The widget and badge use Mainstreet's palette (Base blue + dark surface). They blend with dark UIs out of the box. For light themes, wrap the widget in a dark backdrop:

```html
<div style="background:#0d1117;padding:8px;border-radius:8px;display:inline-block">
  <div data-mainstreet="0x..."></div>
</div>
```

## Performance

- Widget JS: 3.4 KB gzipped, no deps.
- Badge SVG: ~700 B per response, cached 1h.
- Per-agent JSON: ~1 KB, cached 10min.
- Frame OG: cached 30min.

All endpoints are served behind Railway's edge with `Cache-Control` set appropriately. No rate limit for normal use.
