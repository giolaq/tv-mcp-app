import styles from "../tv-app.module.css";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}

export function SearchBar({ value, onChange, onClose }: SearchBarProps) {
  return (
    <div className={styles.searchBar}>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#8e8e93"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search movies and shows..."
        autoFocus
        className={styles.searchInput}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      />
      {value && (
        <button onClick={() => onChange("")} className={styles.searchClear}>
          ✕
        </button>
      )}
    </div>
  );
}
