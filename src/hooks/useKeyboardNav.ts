import { useCallback, useEffect, useState } from "react";
import type { ContentRowData, CatalogItem } from "../types";

interface UseKeyboardNavOptions {
  rows: ContentRowData[];
  enabled: boolean;
  onSelect: (item: CatalogItem) => void;
  onMenuOpen: () => void;
}

export function useKeyboardNav({
  rows,
  enabled,
  onSelect,
  onMenuOpen,
}: UseKeyboardNavOptions) {
  const [focusedRow, setFocusedRow] = useState(0);
  const [focusedCol, setFocusedCol] = useState(0);

  // Clamp focus when rows change
  useEffect(() => {
    setFocusedRow((r) => Math.min(r, Math.max(rows.length - 1, 0)));
  }, [rows.length]);

  useEffect(() => {
    const maxCol = (rows[focusedRow]?.items.length ?? 1) - 1;
    setFocusedCol((c) => Math.min(c, Math.max(maxCol, 0)));
  }, [focusedRow, rows]);

  useEffect(() => {
    if (!enabled) return;

    const handleKey = (e: KeyboardEvent) => {
      // Skip if typing in an input
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedRow((r) => Math.min(r + 1, rows.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedRow((r) => Math.max(r - 1, 0));
          break;
        case "ArrowRight":
          e.preventDefault();
          setFocusedCol((c) => {
            const maxCol = (rows[focusedRow]?.items.length ?? 1) - 1;
            return Math.min(c + 1, maxCol);
          });
          break;
        case "ArrowLeft":
          e.preventDefault();
          setFocusedCol((c) => {
            if (c === 0) {
              onMenuOpen();
              return 0;
            }
            return c - 1;
          });
          break;
        case "Enter": {
          const item = rows[focusedRow]?.items[focusedCol];
          if (item) onSelect(item);
          break;
        }
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [enabled, rows, focusedRow, focusedCol, onSelect, onMenuOpen]);

  const setFocus = useCallback((row: number, col: number) => {
    setFocusedRow(row);
    setFocusedCol(col);
  }, []);

  return { focusedRow, focusedCol, setFocus };
}
