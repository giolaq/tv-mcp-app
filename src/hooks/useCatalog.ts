import { useMemo } from "react";
import type { Catalog, CatalogItem, ContentRowData } from "../types";

function groupByCategory(items: CatalogItem[]): ContentRowData[] {
  const rows: ContentRowData[] = [];

  // Trending row first
  const trending = items.filter((i) => i.trending);
  if (trending.length > 0) {
    rows.push({ title: "Trending Now", items: trending });
  }

  // Group remaining by category
  const categoryMap = new Map<string, CatalogItem[]>();
  for (const item of items) {
    const cat = item.category || "Uncategorized";
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat)!.push(item);
  }

  for (const [category, categoryItems] of categoryMap) {
    rows.push({ title: category, items: categoryItems });
  }

  return rows;
}

/**
 * If the catalog has few items (pre-filtered from a tool), show them
 * as a single "Results" row instead of grouping by category.
 */
function groupFiltered(items: CatalogItem[], label: string): ContentRowData[] {
  if (items.length === 0) return [];
  return [{ title: label, items }];
}

export function useCatalog(
  rawCatalog: string | undefined,
  isFiltered?: boolean,
  filterLabel?: string,
) {
  const catalog = useMemo<Catalog | null>(() => {
    if (!rawCatalog) return null;
    try {
      return JSON.parse(rawCatalog) as Catalog;
    } catch {
      return null;
    }
  }, [rawCatalog]);

  const allRows = useMemo<ContentRowData[]>(() => {
    if (!catalog) return [];
    if (isFiltered) {
      return groupFiltered(catalog.items, filterLabel ?? "Results");
    }
    return groupByCategory(catalog.items);
  }, [catalog, isFiltered, filterLabel]);

  const featuredItem = useMemo<CatalogItem | null>(() => {
    if (!catalog) return null;
    return catalog.items.find((i) => i.trending) ?? catalog.items[0] ?? null;
  }, [catalog]);

  return { catalog, allRows, featuredItem };
}

export function filterRows(
  rows: ContentRowData[],
  query: string,
): ContentRowData[] {
  if (!query.trim()) return rows;
  const q = query.toLowerCase();
  return rows
    .map((row) => ({
      ...row,
      items: row.items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.genres?.some((g) => g.toLowerCase().includes(q)),
      ),
    }))
    .filter((row) => row.items.length > 0);
}
