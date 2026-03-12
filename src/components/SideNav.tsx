import styles from "../tv-app.module.css";

interface SideNavProps {
  isOpen: boolean;
  activeItem: string;
  onSelect: (item: string) => void;
  onClose: () => void;
}

const NAV_ITEMS = [
  { id: "home", label: "Home", icon: "⌂" },
  { id: "explore", label: "Explore", icon: "◎" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

export function SideNav({
  isOpen,
  activeItem,
  onSelect,
  onClose,
}: SideNavProps) {
  return (
    <>
      {isOpen && (
        <div onClick={onClose} className={styles.navOverlay} />
      )}
      <div
        className={`${styles.navDrawer} ${isOpen ? styles.navDrawerOpen : styles.navDrawerClosed}`}
      >
        <div className={styles.navBrand}>TV Streaming</div>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              onSelect(item.id);
              onClose();
            }}
            className={`${styles.navItem} ${activeItem === item.id ? styles.navItemActive : ""}`}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}
