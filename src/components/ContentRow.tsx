import { useEffect, useRef } from "react";
import type { CatalogItem, ContentRowData } from "../types";
import { MovieCard } from "./MovieCard";
import styles from "../tv-app.module.css";

interface ContentRowProps {
  row: ContentRowData;
  rowIndex: number;
  focusedRow: number;
  focusedCol: number;
  onSelectItem: (item: CatalogItem) => void;
  onFocusChange: (row: number, col: number) => void;
}

export function ContentRow({
  row,
  rowIndex,
  focusedRow,
  focusedCol,
  onSelectItem,
  onFocusChange,
}: ContentRowProps) {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isActiveRow = focusedRow === rowIndex;

  useEffect(() => {
    if (isActiveRow && cardRefs.current[focusedCol]) {
      cardRefs.current[focusedCol]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [isActiveRow, focusedCol]);

  return (
    <div className={styles.contentRow}>
      <div className={styles.rowTitle}>{row.title}</div>
      <div className={styles.rowScroll}>
        {row.items.map((item, colIndex) => (
          <MovieCard
            key={item.id}
            ref={(el) => {
              cardRefs.current[colIndex] = el;
            }}
            item={item}
            focused={isActiveRow && focusedCol === colIndex}
            onSelect={onSelectItem}
            onFocus={() => onFocusChange(rowIndex, colIndex)}
          />
        ))}
      </div>
    </div>
  );
}
