import type { CatalogItem } from "../types";
import styles from "../tv-app.module.css";

interface DetailOverlayProps {
  item: CatalogItem;
  onWatch: () => void;
  onClose: () => void;
  onMoreLikeThis?: (item: CatalogItem) => void;
  onAskAbout?: (item: CatalogItem) => void;
}

export function DetailOverlay({
  item,
  onWatch,
  onClose,
  onMoreLikeThis,
  onAskAbout,
}: DetailOverlayProps) {
  const duration = item.duration_sec
    ? `${Math.floor(item.duration_sec / 60)}m`
    : "";
  const hasVideo = item.sources?.length > 0;

  return (
    <div className={styles.detailOverlay}>
      {/* Full-bleed poster */}
      <div className={styles.detailBg}>
        <img src={item.images.poster_16x9} alt={item.title} />
      </div>
      {/* Gradient scrim */}
      <div className={styles.detailScrim} />

      {/* Close */}
      <button onClick={onClose} className={styles.detailClose}>
        ✕
      </button>

      {/* Info at bottom */}
      <div className={styles.detailInfo}>
        <h1 className={styles.detailTitle}>{item.title}</h1>
        <div className={styles.detailMeta}>
          <span>{item.release_year}</span>
          <span>{item.rating_stars}★ ({item.rating_count})</span>
          <span>{item.content_rating}</span>
          {duration && <span>{duration}</span>}
        </div>
        <div className={styles.detailGenres}>
          {item.genres?.map((genre) => (
            <span key={genre} className={styles.genrePill}>
              {genre}
            </span>
          ))}
        </div>
        <p className={styles.detailDescription}>{item.description}</p>
        <div className={styles.detailActions}>
          {hasVideo && (
            <button onClick={onWatch} className={styles.btnPrimary}>
              ▶ Watch Now
            </button>
          )}
          {onMoreLikeThis && (
            <button
              onClick={() => onMoreLikeThis(item)}
              className={styles.btnSecondary}
            >
              More Like This
            </button>
          )}
          {onAskAbout && (
            <button
              onClick={() => onAskAbout(item)}
              className={styles.btnSecondary}
            >
              Ask About This
            </button>
          )}
          <button onClick={onClose} className={styles.btnSecondary}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
