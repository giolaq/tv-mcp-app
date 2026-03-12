import { MCPServer, text, widget } from "mcp-use/server";
import { z } from "zod";

const CATALOG_URL = "https://giolaq.github.io/scrap-tv-feed/catalog.json";

const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;

const server = new MCPServer({
  name: "tv-streaming",
  title: "TV Streaming",
  version: "1.0.0",
  description:
    "A TV streaming assistant that helps users discover, filter, recommend, and play content from the catalog.",
  host: process.env.HOST ?? "0.0.0.0",
  baseUrl: process.env.MCP_URL ?? `http://localhost:${port}`,
});

// ── Catalog cache (5-minute TTL) ────────────────────────────────────

interface CatalogItem {
  id: string;
  type: string;
  title: string;
  category: string;
  genres: string[];
  trending: boolean;
  rating_count: number;
  rating_stars: number;
  content_rating: string;
  release_year: number;
  images: { poster_16x9: string };
  sources: Array<{ type: string; url: string }>;
  description: string;
  duration_sec: number;
}

interface Catalog {
  catalog_version: string;
  updated_at: string;
  items: CatalogItem[];
}

let cachedCatalog: Catalog | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCatalog(): Promise<Catalog> {
  const now = Date.now();
  if (cachedCatalog && now - cacheTime < CACHE_TTL) {
    return cachedCatalog;
  }
  const res = await fetch(CATALOG_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch catalog: ${res.status} ${res.statusText}`);
  }
  cachedCatalog = (await res.json()) as Catalog;
  cacheTime = now;
  return cachedCatalog;
}

// ── Helper: find item by ID or fuzzy title match ────────────────────

function findItem(
  items: CatalogItem[],
  id?: string,
  title?: string,
): CatalogItem | undefined {
  if (id) return items.find((i) => i.id === id);
  if (!title) return undefined;
  const q = title.toLowerCase();
  // Exact match first
  const exact = items.find((i) => i.title.toLowerCase() === q);
  if (exact) return exact;
  // Partial match
  return items.find((i) => i.title.toLowerCase().includes(q));
}

// ── Helper: recommendation scoring ──────────────────────────────────

function scoreRecommendation(
  candidate: CatalogItem,
  reference: CatalogItem,
): number {
  let score = 0;
  // +3 per shared genre
  for (const genre of candidate.genres) {
    if (reference.genres.includes(genre)) score += 3;
  }
  // +2 same category
  if (candidate.category === reference.category) score += 2;
  // +1 same content_rating
  if (candidate.content_rating === reference.content_rating) score += 1;
  // +1 if rating within 0.5
  if (Math.abs(candidate.rating_stars - reference.rating_stars) <= 0.5)
    score += 1;
  return score;
}

// ── Tool 1: discover_content (model-visible, widget) ────────────────

server.tool(
  {
    name: "discover_content",
    description:
      'Browse and filter the TV streaming catalog. Opens the TV widget with filtered results. Handles "something funny", "top rated sci-fi", "what\'s trending", compound filters. Use this when the user wants to browse, search, or filter content visually.',
    schema: z.object({
      query: z
        .string()
        .optional()
        .describe("Free-text search across titles and descriptions"),
      genres: z
        .array(z.string())
        .optional()
        .describe("Filter by genre(s), e.g. ['Comedy', 'Drama']"),
      category: z
        .string()
        .optional()
        .describe("Filter by category, e.g. 'Movies'"),
      min_rating: z
        .number()
        .min(1)
        .max(5)
        .optional()
        .describe("Minimum star rating (1-5)"),
      content_rating: z
        .array(z.string())
        .optional()
        .describe("Content rating filter: TV-G, TV-PG, TV-14, TV-MA"),
      year_from: z.number().optional().describe("Earliest release year"),
      year_to: z.number().optional().describe("Latest release year"),
      trending_only: z
        .boolean()
        .optional()
        .describe("Only show trending titles"),
      sort_by: z
        .enum(["rating", "year", "title"])
        .optional()
        .describe("Sort results by rating, year, or title"),
      limit: z
        .number()
        .min(1)
        .max(30)
        .optional()
        .describe("Max number of results (1-30)"),
    }),
    widget: {
      name: "tv-streaming",
      invoking: "Searching catalog...",
      invoked: "Results ready",
    },
  },
  async ({
    query,
    genres,
    category,
    min_rating,
    content_rating,
    year_from,
    year_to,
    trending_only,
    sort_by,
    limit,
  }: {
    query?: string;
    genres?: string[];
    category?: string;
    min_rating?: number;
    content_rating?: string[];
    year_from?: number;
    year_to?: number;
    trending_only?: boolean;
    sort_by?: "rating" | "year" | "title";
    limit?: number;
  }) => {
    const catalog = await getCatalog();
    let results = [...catalog.items];

    // Apply filters
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q) ||
          i.genres?.some((g) => g.toLowerCase().includes(q)) ||
          i.category?.toLowerCase().includes(q),
      );
    }
    if (genres && genres.length > 0) {
      const genresLower = genres.map((g) => g.toLowerCase());
      results = results.filter((i) =>
        i.genres?.some((g) => genresLower.includes(g.toLowerCase())),
      );
    }
    if (category) {
      const catLower = category.toLowerCase();
      results = results.filter(
        (i) => i.category?.toLowerCase() === catLower,
      );
    }
    if (min_rating !== undefined) {
      results = results.filter((i) => i.rating_stars >= min_rating);
    }
    if (content_rating && content_rating.length > 0) {
      const ratingsLower = content_rating.map((r) => r.toLowerCase());
      results = results.filter((i) =>
        ratingsLower.includes(i.content_rating?.toLowerCase()),
      );
    }
    if (year_from !== undefined) {
      results = results.filter((i) => i.release_year >= year_from);
    }
    if (year_to !== undefined) {
      results = results.filter((i) => i.release_year <= year_to);
    }
    if (trending_only) {
      results = results.filter((i) => i.trending);
    }

    // Sort
    if (sort_by === "rating") {
      results.sort((a, b) => b.rating_stars - a.rating_stars);
    } else if (sort_by === "year") {
      results.sort((a, b) => b.release_year - a.release_year);
    } else if (sort_by === "title") {
      results.sort((a, b) => a.title.localeCompare(b.title));
    }

    // Limit
    if (limit) {
      results = results.slice(0, limit);
    }

    // Build filter description for display
    const activeFilters: Record<string, unknown> = {};
    if (query) activeFilters.query = query;
    if (genres) activeFilters.genres = genres;
    if (category) activeFilters.category = category;
    if (min_rating) activeFilters.min_rating = min_rating;
    if (content_rating) activeFilters.content_rating = content_rating;
    if (year_from) activeFilters.year_from = year_from;
    if (year_to) activeFilters.year_to = year_to;
    if (trending_only) activeFilters.trending_only = trending_only;
    if (sort_by) activeFilters.sort_by = sort_by;

    const filteredCatalog = {
      ...catalog,
      items: results,
    };

    const filterParts: string[] = [];
    if (query) filterParts.push(`matching "${query}"`);
    if (genres) filterParts.push(`genres: ${genres.join(", ")}`);
    if (category) filterParts.push(`category: ${category}`);
    if (min_rating) filterParts.push(`${min_rating}+ stars`);
    if (trending_only) filterParts.push("trending");
    const filterDesc =
      filterParts.length > 0 ? ` (${filterParts.join(", ")})` : "";

    const summary = [
      `Found ${results.length} titles${filterDesc}`,
      "",
      ...results.slice(0, 5).map(
        (i) =>
          `- ${i.title} (${i.release_year}) – ${i.rating_stars}★ – ${i.category}`,
      ),
      results.length > 5 ? `… and ${results.length - 5} more` : "",
    ].join("\n");

    return widget({
      props: {
        viewMode: "browse",
        catalog: JSON.stringify(filteredCatalog),
        filters: JSON.stringify(activeFilters),
      },
      output: text(summary),
    });
  },
);

// ── Tool 2: get_title_details (model-visible, text-only) ────────────

server.tool(
  {
    name: "get_title_details",
    description:
      'Get detailed factual information about a specific title. Returns text so the model can reason about it (e.g. "This is TV-MA, not suitable for kids"). Use this when the user asks about a specific title.',
    schema: z.object({
      id: z.string().optional().describe("Title ID for exact lookup"),
      title: z
        .string()
        .optional()
        .describe("Partial or exact title for fuzzy lookup"),
    }),
    widget: {
      name: "tv-streaming",
      invoking: "Looking up title...",
      invoked: "Title info ready",
    },
  },
  async ({ id, title }: { id?: string; title?: string }) => {
    if (!id && !title) {
      return text("Please provide either an id or title to look up.");
    }
    const catalog = await getCatalog();
    const item = findItem(catalog.items, id, title);

    if (!item) {
      return text(
        `Title not found${title ? ` for "${title}"` : ""}${id ? ` with ID "${id}"` : ""}.`,
      );
    }

    const dur = item.duration_sec
      ? `${Math.floor(item.duration_sec / 60)}m`
      : "Unknown";

    return widget({
      props: {
        viewMode: "details",
        detailItemId: item.id,
        catalog: JSON.stringify({ ...catalog, items: [item] }),
      },
      output: text(
        [
          `**${item.title}** (ID: ${item.id})`,
          `Year: ${item.release_year} | Rating: ${item.rating_stars}★ (${item.rating_count} reviews) | ${item.content_rating}`,
          `Duration: ${dur} | Category: ${item.category}`,
          `Genres: ${item.genres?.join(", ") || "N/A"}`,
          "",
          item.description,
          "",
          `Trending: ${item.trending ? "Yes" : "No"}`,
          item.sources?.length ? "Video available: Yes" : "Video available: No",
        ].join("\n"),
      ),
    });
  },
);

// ── Tool 3: play_title (model-visible, widget) ─────────────────────

server.tool(
  {
    name: "play_title",
    description:
      'Play a specific title directly. Opens the widget in player mode with no intermediate browse view. Use when the user says "play X".',
    schema: z.object({
      id: z.string().describe("Title ID to play"),
    }),
    widget: {
      name: "tv-streaming",
      invoking: "Starting playback...",
      invoked: "Now playing",
    },
  },
  async ({ id }: { id: string }) => {
    const catalog = await getCatalog();
    const item = catalog.items.find((i) => i.id === id);

    if (!item) {
      return text(`Title with ID "${id}" not found.`);
    }

    if (!item.sources?.length) {
      return text(`"${item.title}" has no video source available.`);
    }

    return widget({
      props: {
        viewMode: "player",
        playItemId: item.id,
        catalog: JSON.stringify({ ...catalog, items: [item] }),
      },
      output: text(`Now playing: **${item.title}** (${item.release_year})`),
    });
  },
);

// ── Tool 4: get_recommendations (model-visible, widget) ─────────────

server.tool(
  {
    name: "get_recommendations",
    description:
      'Find similar titles based on genre overlap, category, rating proximity, and content rating. Returns a curated row of recommendations. Use when the user asks for "more like this" or similar content.',
    schema: z.object({
      based_on_id: z.string().describe("Reference title ID to base recommendations on"),
      limit: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .describe("Number of recommendations (1-10, default 5)"),
    }),
    widget: {
      name: "tv-streaming",
      invoking: "Finding recommendations...",
      invoked: "Recommendations ready",
    },
  },
  async ({ based_on_id, limit }: { based_on_id: string; limit?: number }) => {
    const catalog = await getCatalog();
    const reference = catalog.items.find((i) => i.id === based_on_id);

    if (!reference) {
      return text(`Reference title with ID "${based_on_id}" not found.`);
    }

    const maxResults = limit ?? 5;

    const scored = catalog.items
      .filter((i) => i.id !== based_on_id)
      .map((item) => ({
        item,
        score: scoreRecommendation(item, reference),
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);

    const recommendations = scored.map((s) => s.item);

    if (recommendations.length === 0) {
      return text(
        `No similar titles found for "${reference.title}".`,
      );
    }

    const summary = [
      `${recommendations.length} titles similar to "${reference.title}":`,
      "",
      ...recommendations.map(
        (i) =>
          `- ${i.title} (${i.release_year}) – ${i.rating_stars}★ – ${i.genres.join(", ")}`,
      ),
    ].join("\n");

    return widget({
      props: {
        viewMode: "browse",
        catalog: JSON.stringify({ ...catalog, items: recommendations }),
        recommendations: JSON.stringify(recommendations),
      },
      output: text(summary),
    });
  },
);

// ── Tool 5: get_catalog_overview (model-visible, text-only) ─────────

server.tool(
  {
    name: "get_catalog_overview",
    description:
      'Get a high-level overview of the catalog structure: category counts, genre distribution, rating ranges, trending count. Does NOT open the widget. Use when the user asks "what do you have?" or "what genres/categories are available?".',
  },
  async () => {
    const catalog = await getCatalog();
    const items = catalog.items;

    // Category counts
    const categoryCounts = new Map<string, number>();
    for (const item of items) {
      const cat = item.category || "Uncategorized";
      categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
    }

    // Genre counts
    const genreCounts = new Map<string, number>();
    for (const item of items) {
      for (const genre of item.genres ?? []) {
        genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
      }
    }

    // Rating range
    const ratings = items.map((i) => i.rating_stars).filter(Boolean);
    const minRating = Math.min(...ratings);
    const maxRating = Math.max(...ratings);

    // Content ratings
    const contentRatings = new Set(items.map((i) => i.content_rating).filter(Boolean));

    // Trending
    const trendingCount = items.filter((i) => i.trending).length;

    // Year range
    const years = items.map((i) => i.release_year).filter(Boolean);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    const lines = [
      `**TV Streaming Catalog** — ${items.length} titles`,
      "",
      "**Categories:**",
      ...[...categoryCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([cat, count]) => `  ${cat}: ${count}`),
      "",
      "**Genres:**",
      ...[...genreCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([genre, count]) => `  ${genre}: ${count}`),
      "",
      `**Ratings:** ${minRating}★ – ${maxRating}★`,
      `**Content Ratings:** ${[...contentRatings].join(", ")}`,
      `**Release Years:** ${minYear} – ${maxYear}`,
      `**Trending:** ${trendingCount} titles`,
    ];

    return text(lines.join("\n"));
  },
);

// ── Tool 6: widget_show_details (app-only) ──────────────────────────

server.tool(
  {
    name: "widget_show_details",
    description:
      "App-only: Widget calls this when a user clicks a card to show the detail overlay. Not intended for model use.",
    schema: z.object({
      id: z.string().describe("The title ID to show details for"),
    }),
    widget: {
      name: "tv-streaming",
      invoking: "Loading details...",
      invoked: "Details ready",
    },
  },
  async ({ id }: { id: string }) => {
    const catalog = await getCatalog();
    const item = catalog.items.find((i) => i.id === id);

    if (!item) {
      return text(`Title with ID "${id}" not found.`);
    }

    return widget({
      props: {
        viewMode: "details",
        detailItemId: item.id,
        catalog: JSON.stringify({ ...catalog, items: [item] }),
      },
      output: text(`Showing details for: ${item.title}`),
    });
  },
);

// ── Tool 7: widget_play_title (app-only) ────────────────────────────

server.tool(
  {
    name: "widget_play_title",
    description:
      'App-only: Widget calls this when a user clicks "Watch Now" in the detail overlay. Not intended for model use.',
    schema: z.object({
      id: z.string().describe("The title ID to play"),
    }),
    widget: {
      name: "tv-streaming",
      invoking: "Starting playback...",
      invoked: "Now playing",
    },
  },
  async ({ id }: { id: string }) => {
    const catalog = await getCatalog();
    const item = catalog.items.find((i) => i.id === id);

    if (!item) {
      return text(`Title with ID "${id}" not found.`);
    }

    if (!item.sources?.length) {
      return text(`"${item.title}" has no video source available.`);
    }

    return widget({
      props: {
        viewMode: "player",
        playItemId: item.id,
        catalog: JSON.stringify({ ...catalog, items: [item] }),
      },
      output: text(`Now playing: ${item.title}`),
    });
  },
);

await server.listen(port);
