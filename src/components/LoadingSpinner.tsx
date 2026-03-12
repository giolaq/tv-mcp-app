import styles from "../tv-app.module.css";

export function LoadingSpinner() {
  return (
    <div className={styles.spinner}>
      <div className={styles.spinnerRing} />
    </div>
  );
}
