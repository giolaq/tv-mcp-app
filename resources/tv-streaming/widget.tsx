import { Component as ReactComponent, useCallback, useEffect, useMemo, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { z } from "zod";
import {
  useWidget,
  useCallTool,
  McpUseProvider,
  type WidgetMetadata,
} from "mcp-use/react";

import "../../src/global.css";
import styles from "../../src/tv-app.module.css";
import type {
  CatalogItem,
  ViewState,
  WidgetProps,
  ActiveFilters,
} from "../../src/types";
import { useCatalog, filterRows } from "../../src/hooks/useCatalog";
import { useKeyboardNav } from "../../src/hooks/useKeyboardNav";
import { LoadingSpinner } from "../../src/components/LoadingSpinner";
import { HeroBanner } from "../../src/components/HeroBanner";
import { ContentRow } from "../../src/components/ContentRow";
import { DetailOverlay } from "../../src/components/DetailOverlay";
import { VideoPlayer } from "../../src/components/VideoPlayer";
import { SideNav } from "../../src/components/SideNav";
import { SearchBar } from "../../src/components/SearchBar";

// ── Widget metadata ────────────────────────────────────────────────────

const propSchema = z.object({
  viewMode: z
    .enum(["browse", "details", "player"])
    .optional()
    .describe("View mode: browse, details, or player"),
  catalog: z
    .string()
    .optional()
    .describe("JSON string of the TV catalog data (may be filtered)"),
  filters: z
    .string()
    .optional()
    .describe("JSON string of active filters for display"),
  detailItemId: z
    .string()
    .optional()
    .describe("Item ID for detail view"),
  playItemId: z
    .string()
    .optional()
    .describe("Item ID for player view"),
  recommendations: z
    .string()
    .optional()
    .describe("JSON string of recommendation results"),
});

export const widgetMetadata: WidgetMetadata = {
  description:
    "TV streaming interface with browsing, details, and video playback",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    prefersBorder: false,
    autoResize: true,
    widgetDescription: "Interactive TV streaming catalog browser",
    csp: {
      connectDomains: ["https://giolaq.github.io"],
      resourceDomains: ["https://giolaq.github.io"],
    },
  },
};

// ── Inner widget ───────────────────────────────────────────────────────

function TvStreamingInner() {
  const {
    isPending,
    isStreaming,
    sendFollowUpMessage,
    props: widgetProps,
  } = useWidget<WidgetProps>();

  const isBusy = isPending || isStreaming;

  // Determine if data came pre-filtered from a tool
  const activeFilters = useMemo<ActiveFilters | null>(() => {
    if (!widgetProps.filters) return null;
    try {
      return JSON.parse(widgetProps.filters) as ActiveFilters;
    } catch {
      return null;
    }
  }, [widgetProps.filters]);

  const isFiltered =
    activeFilters !== null && Object.keys(activeFilters).length > 0;

  const hasRecommendations = !!widgetProps.recommendations;

  // Build a label for the filtered row
  const filterLabel = useMemo(() => {
    if (hasRecommendations) return "Recommendations";
    if (!activeFilters) return "Results";
    const parts: string[] = [];
    if (activeFilters.query) parts.push(`"${activeFilters.query}"`);
    if (activeFilters.genres) parts.push(activeFilters.genres.join(", "));
    if (activeFilters.category) parts.push(activeFilters.category);
    if (activeFilters.trending_only) parts.push("Trending");
    return parts.length > 0 ? parts.join(" · ") : "Results";
  }, [activeFilters, hasRecommendations]);

  const { catalog, allRows, featuredItem } = useCatalog(
    widgetProps.catalog,
    isFiltered || hasRecommendations,
    filterLabel,
  );

  // Parse all items for lookup by ID
  const allItems = useMemo<CatalogItem[]>(() => {
    return catalog?.items ?? [];
  }, [catalog]);

  // ── View state ──────────────────────────────────────────────────────
  // Derive initial view from tool props
  const initialView = useMemo<ViewState>(() => {
    if (widgetProps.viewMode === "player" && widgetProps.playItemId)
      return "player";
    if (widgetProps.viewMode === "details" && widgetProps.detailItemId)
      return "details";
    return "home";
  }, [widgetProps.viewMode, widgetProps.playItemId, widgetProps.detailItemId]);

  const [view, setView] = useState<ViewState>(initialView);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showNav, setShowNav] = useState(false);

  // Sync view when tool props change (e.g., new tool call arrives)
  useEffect(() => {
    if (widgetProps.viewMode === "player" && widgetProps.playItemId) {
      const item = allItems.find((i) => i.id === widgetProps.playItemId);
      if (item) {
        setSelectedItem(item);
        setView("player");
        return;
      }
    }
    if (widgetProps.viewMode === "details" && widgetProps.detailItemId) {
      const item = allItems.find((i) => i.id === widgetProps.detailItemId);
      if (item) {
        setSelectedItem(item);
        setView("details");
        return;
      }
    }
    if (widgetProps.viewMode === "browse") {
      setView("home");
      setSelectedItem(null);
    }
  }, [
    widgetProps.viewMode,
    widgetProps.playItemId,
    widgetProps.detailItemId,
    allItems,
  ]);

  // ── App-only tools ──────────────────────────────────────────────────
  const showDetailsToolCall = useCallTool<{ id: string }>("widget_show_details");
  const playTitleToolCall = useCallTool<{ id: string }>("widget_play_title");

  // Filtered rows
  const rows = useMemo(
    () => filterRows(allRows, searchQuery),
    [allRows, searchQuery],
  );

  // Navigation callbacks
  const handleSelectItem = useCallback(
    (item: CatalogItem) => {
      setSelectedItem(item);
      setView("details");
      // Fire app-only tool (no AI round-trip)
      showDetailsToolCall.callTool({ id: item.id });
    },
    [showDetailsToolCall],
  );

  const handleWatch = useCallback(
    (item: CatalogItem) => {
      setSelectedItem(item);
      setView("player");
      // Fire app-only tool (no AI round-trip)
      playTitleToolCall.callTool({ id: item.id });
    },
    [playTitleToolCall],
  );

  const handleBack = useCallback(() => {
    setView((v) => {
      if (v === "player") return "details";
      if (v === "details") {
        setSelectedItem(null);
        return "home";
      }
      return v;
    });
  }, []);

  const handleMenuOpen = useCallback(() => setShowNav(true), []);

  // "More Like This" — ask the model via follow-up
  const handleMoreLikeThis = useCallback(
    (item: CatalogItem) => {
      sendFollowUpMessage(
        `Show me titles similar to "${item.title}" (ID: ${item.id})`,
      );
    },
    [sendFollowUpMessage],
  );

  // "Ask About This" — ask the model via follow-up
  const handleAskAbout = useCallback(
    (item: CatalogItem) => {
      sendFollowUpMessage(`Tell me more about "${item.title}" (ID: ${item.id})`);
    },
    [sendFollowUpMessage],
  );

  // Keyboard nav for home grid
  const { focusedRow, focusedCol, setFocus } = useKeyboardNav({
    rows,
    enabled: view === "home" && !showSearch,
    onSelect: handleSelectItem,
    onMenuOpen: handleMenuOpen,
  });

  // Global Escape handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showSearch) {
        setShowSearch(false);
        setSearchQuery("");
      } else if (showNav) {
        setShowNav(false);
      } else if (view !== "home") {
        handleBack();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [view, showSearch, showNav, handleBack]);

  // "/" to open search
  useEffect(() => {
    if (view !== "home") return;
    const handleSlash = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    document.addEventListener("keydown", handleSlash);
    return () => document.removeEventListener("keydown", handleSlash);
  }, [view]);

  // Loading
  if (isBusy && !catalog) {
    return <LoadingSpinner />;
  }

  // No catalog yet
  if (!catalog) {
    return (
      <div className={styles.emptyState}>
        No catalog data. Ask me to browse, search, or recommend content.
      </div>
    );
  }

  // Video player (full-screen, replaces everything)
  if (view === "player" && selectedItem) {
    return <VideoPlayer item={selectedItem} onClose={handleBack} />;
  }

  return (
    <div className={styles.root}>
      {/* Side navigation */}
      <SideNav
        isOpen={showNav}
        activeItem="home"
        onSelect={() => {}}
        onClose={() => setShowNav(false)}
      />

      {/* Top bar */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <button
            onClick={() => setShowNav(true)}
            className={styles.iconButton}
          >
            ☰
          </button>
          <span className={styles.brandName}>TV Streaming</span>
        </div>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className={styles.iconButton}
          aria-label="Search"
        >
          ⌕
        </button>
      </div>

      {/* Search */}
      {showSearch && (
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onClose={() => {
            setShowSearch(false);
            setSearchQuery("");
          }}
        />
      )}

      {/* Scrollable content */}
      <div className={styles.scrollArea}>
        {/* Hero — only on unfiltered browse */}
        {!searchQuery && !isFiltered && !hasRecommendations && featuredItem && (
          <HeroBanner
            item={featuredItem}
            onWatch={handleWatch}
            onDetails={handleSelectItem}
          />
        )}

        {/* Content rows */}
        {rows.map((row, idx) => (
          <ContentRow
            key={row.title}
            row={row}
            rowIndex={idx}
            focusedRow={focusedRow}
            focusedCol={focusedCol}
            onSelectItem={handleSelectItem}
            onFocusChange={setFocus}
          />
        ))}

        {/* No search results */}
        {searchQuery && rows.length === 0 && (
          <div className={styles.noResults}>
            No results for &ldquo;{searchQuery}&rdquo;
          </div>
        )}
      </div>

      {/* Detail overlay */}
      {view === "details" && selectedItem && (
        <DetailOverlay
          item={selectedItem}
          onWatch={() => handleWatch(selectedItem)}
          onClose={handleBack}
          onMoreLikeThis={handleMoreLikeThis}
          onAskAbout={handleAskAbout}
        />
      )}
    </div>
  );
}

// ── Error boundary ──────────────────────────────────────────────────────

class WidgetErrorBoundary extends ReactComponent<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[TV Widget Error]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ background: "#1a0000", color: "#ff6b6b", padding: 24, fontFamily: "monospace", fontSize: 13 }}>
          <strong>Widget Error:</strong>
          <pre style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{this.state.error.message}</pre>
          <pre style={{ whiteSpace: "pre-wrap", marginTop: 4, color: "#888", fontSize: 11 }}>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Export with provider ───────────────────────────────────────────────

export default function TvStreamingWidget() {
  return (
    <WidgetErrorBoundary>
      <McpUseProvider autoSize>
        <TvStreamingInner />
      </McpUseProvider>
    </WidgetErrorBoundary>
  );
}
