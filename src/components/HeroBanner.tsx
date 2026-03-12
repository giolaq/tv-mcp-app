import type { CatalogItem } from "../types";
import styles from "../tv-app.module.css";

interface HeroBannerProps {
  item: CatalogItem;
  onWatch: (item: CatalogItem) => void;
  onDetails: (item: CatalogItem) => void;
}

export function HeroBanner({ item, onWatch, onDetails }: HeroBannerProps) {
  const duration = item.duration_sec
    ? `${Math.floor(item.duration_sec / 60)}m`
    : "";

  return (
    <div className={styles.hero}>
      <img
        src={item.images.poster_16x9}
        alt={item.title}
        className={styles.heroImage}
      />
      <div className={styles.heroGradientH} />
      <div className={styles.heroGradientV} />
      <div className={styles.heroContent}>
        <h1 className={styles.heroTitle}>{item.title}</h1>
        <div className={styles.heroMeta}>
          <span>{item.release_year}</span>
          <span>|</span>
          <span>{item.rating_stars}★</span>
          <span>|</span>
          <span>{item.content_rating}</span>
          {duration && (
            <>
              <span>|</span>
              <span>{duration}</span>
            </>
          )}
        </div>
        <p className={styles.heroDescription}>{item.description}</p>
        <div className={styles.heroButtons}>
          <button onClick={() => onWatch(item)} className={styles.btnPrimary}>
            ▶ Watch Now
          </button>
          <button
            onClick={() => onDetails(item)}
            className={styles.btnSecondary}
          >
            More Info
          </button>
        </div>
      </div>
    </div>
  );
}
