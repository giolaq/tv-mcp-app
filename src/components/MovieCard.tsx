import { forwardRef, useState } from "react";
import type { CatalogItem } from "../types";
import styles from "../tv-app.module.css";

interface MovieCardProps {
  item: CatalogItem;
  focused: boolean;
  onSelect: (item: CatalogItem) => void;
  onFocus?: () => void;
}

export const MovieCard = forwardRef<HTMLDivElement, MovieCardProps>(
  function MovieCard({ item, focused, onSelect, onFocus }, ref) {
    const [hovered, setHovered] = useState(false);
    const isHighlighted = focused || hovered;

    return (
      <div
        ref={ref}
        tabIndex={0}
        role="button"
        onClick={() => onSelect(item)}
        onMouseEnter={() => {
          setHovered(true);
          onFocus?.();
        }}
        onMouseLeave={() => setHovered(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSelect(item);
        }}
        className={`${styles.card} ${isHighlighted ? styles.cardFocused : ""}`}
      >
        <div className={styles.cardPoster}>
          <img src={item.images.poster_16x9} alt={item.title} loading="lazy" />
        </div>
        <div className={styles.cardLabel}>
          <div className={styles.cardTitle}>{item.title}</div>
        </div>
        {item.trending && <div className={styles.cardBadge}>TRENDING</div>}
      </div>
    );
  },
);
