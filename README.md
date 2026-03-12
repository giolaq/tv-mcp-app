# TV Streaming MCP App

An MCP App that provides an AI-powered TV streaming assistant. The AI model discovers, filters, recommends, and plays content from a remote catalog through a rich interactive widget.

Built with [mcp-use](https://www.npmjs.com/package/mcp-use), React, and TypeScript.

## Quick Start

```bash
npm install
npm run dev
```

The server starts at `http://localhost:3000` (or the next available port) with the MCP endpoint at `/mcp` and an inspector UI at `/inspector`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with HMR and inspector |
| `npm run build` | Production build |
| `npm start` | Start the production server |

## Architecture

The app follows a **model-as-router, widget-as-renderer** pattern:

- The AI model decides *what* to show and *why* using tool calls
- The widget handles all visual presentation and user interaction
- Text responses are for model reasoning; the widget is for display
- The catalog is cached server-side with a 5-minute TTL

### Tools (7 total)

#### Model-Visible (5)

| Tool | Returns | Purpose |
|------|---------|---------|
| `discover_content` | widget + text | Browse, filter, and search the catalog |
| `get_title_details` | widget + text | Factual info about a specific title |
| `play_title` | widget + text | Direct playback in player mode |
| `get_recommendations` | widget + text | "More like this" based on scoring |
| `get_catalog_overview` | text only | Catalog stats without opening the widget |

#### App-Only (2)

These are called by the widget directly (no AI round-trip) for instant interactivity:

| Tool | Purpose |
|------|---------|
| `widget_show_details` | Card click opens detail overlay |
| `widget_play_title` | "Watch Now" click starts playback |

### `discover_content` Filters

All filters are optional and composable:

- `query` — free-text search across titles and descriptions
- `genres` — filter by genre(s)
- `category` — filter by category
- `min_rating` — minimum star rating (1-5)
- `content_rating` — TV-G, TV-PG, TV-14, TV-MA
- `year_from` / `year_to` — release year range
- `trending_only` — only trending titles
- `sort_by` — sort by `rating`, `year`, or `title`
- `limit` — max results (1-30)

### Recommendation Scoring

`get_recommendations` scores candidates against a reference title:

- **+3** per shared genre
- **+2** same category
- **+1** same content rating
- **+1** if star rating within 0.5

### Widget Props

The widget receives structured data from tool calls:

```
viewMode        "browse" | "details" | "player"
catalog         Filtered catalog JSON
filters         Active filter metadata for display
detailItemId    Item ID for detail view
playItemId      Item ID for player view
recommendations Recommendation results JSON
```

### Widget Interactivity

The widget uses `useCallTool` for app-only tools (card clicks, watch button) and `sendFollowUpMessage` for actions that need AI involvement ("More Like This", "Ask About This").

## Project Structure

```
index.ts                          Server — 7 tools + catalog caching
resources/tv-streaming/widget.tsx Widget entry — prop routing + view state
src/
  types.ts                        Shared types (CatalogItem, WidgetProps, etc.)
  hooks/
    useCatalog.ts                 Catalog parsing + row grouping
    useKeyboardNav.ts             Arrow-key navigation for the grid
    useIntersectionPause.ts       Pause off-screen video
  components/
    HeroBanner.tsx                Featured title hero
    ContentRow.tsx                Horizontal scrolling row of cards
    MovieCard.tsx                 Individual title card
    DetailOverlay.tsx             Full-screen detail view with actions
    VideoPlayer.tsx               MP4 video player
    SearchBar.tsx                 In-widget search input
    SideNav.tsx                   Side navigation drawer
    LoadingSpinner.tsx            Loading state
  tv-app.module.css               All widget styles
  global.css                      CSS reset
```

## Catalog

The catalog is fetched from a [remote JSON feed](https://giolaq.github.io/scrap-tv-feed/catalog.json) and cached server-side for 5 minutes. Each title includes genres, category, star rating, content rating, release year, trending flag, poster image, description, and MP4 video source.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `HOST` | `0.0.0.0` | Bind address |
| `MCP_URL` | `http://localhost:$PORT` | Public base URL for the MCP server |

## Deployment

### Local with Tunnel

Expose your local dev server via a public tunnel for use with Claude Desktop or other MCP clients:

```bash
npm run dev -- --tunnel
```

This starts the dev server with HMR and creates a public URL like `https://<subdomain>.local.mcp-use.run/mcp`. The subdomain is persistent across restarts.

### Manufact Cloud

Deploy to Manufact cloud from a GitHub repo:

```bash
npx mcp-use login
npx mcp-use deploy
```

### Connecting to Claude Desktop

Add the MCP server URL to your Claude Desktop config:

```json
{
  "mcpServers": {
    "tv-streaming": {
      "url": "https://<your-subdomain>.local.mcp-use.run/mcp"
    }
  }
}
```

## Example Conversations

```
User: "What shows do you have?"
  -> get_catalog_overview -> text response with stats

User: "Show me comedies"
  -> discover_content({ genres: ["Comedy"] }) -> widget with filtered results

User: "Tell me about Aliens From Vega"
  -> get_title_details({ title: "Aliens From Vega" }) -> text + detail widget

User: "Play it"
  -> play_title({ id: "..." }) -> widget in player mode

User: "Something similar?"
  -> get_recommendations({ based_on_id: "..." }) -> widget with curated row
```
