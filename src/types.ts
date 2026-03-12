export interface CatalogItem {
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
  images: {
    poster_16x9: string;
  };
  sources: Array<{
    type: string;
    url: string;
  }>;
  description: string;
  duration_sec: number;
}

export interface Catalog {
  catalog_version: string;
  updated_at: string;
  items: CatalogItem[];
}

export interface ContentRowData {
  title: string;
  items: CatalogItem[];
}

export type ViewState = "home" | "details" | "player";

// ── New types for tool redesign ─────────────────────────────────────

export type ViewMode = "browse" | "details" | "player";

export interface ActiveFilters {
  query?: string;
  genres?: string[];
  category?: string;
  min_rating?: number;
  content_rating?: string[];
  year_from?: number;
  year_to?: number;
  trending_only?: boolean;
  sort_by?: "rating" | "year" | "title";
}

export interface WidgetProps {
  viewMode?: ViewMode;
  catalog?: string;
  filters?: string; // JSON-serialized ActiveFilters
  detailItemId?: string;
  playItemId?: string;
  recommendations?: string; // JSON-serialized CatalogItem[]
}
