import { useCallback, useEffect, useRef, useState } from "react";
import type { CatalogItem } from "../types";
import { useIntersectionPause } from "../hooks/useIntersectionPause";
import styles from "../tv-app.module.css";

interface VideoPlayerProps {
  item: CatalogItem;
  onClose: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VideoPlayer({ item, onClose }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimerRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

  useIntersectionPause(videoRef);

  const videoUrl = item.sources?.[0]?.url;

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
    }, 5000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => window.clearTimeout(hideTimerRef.current);
  }, [resetHideTimer]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };
    const onLoadedMetadata = () => setDuration(video.duration);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => {
      setIsPlaying(false);
      setShowControls(true);
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          video.paused ? video.play() : video.pause();
          resetHideTimer();
          break;
        case "ArrowRight":
          e.preventDefault();
          video.currentTime = Math.min(video.currentTime + 10, video.duration);
          resetHideTimer();
          break;
        case "ArrowLeft":
          e.preventDefault();
          video.currentTime = Math.max(video.currentTime - 10, 0);
          resetHideTimer();
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, resetHideTimer]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.paused ? video.play() : video.pause();
    resetHideTimer();
  }, [resetHideTimer]);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const video = videoRef.current;
      if (!video || !video.duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      video.currentTime = percent * video.duration;
      resetHideTimer();
    },
    [resetHideTimer],
  );

  if (!videoUrl) {
    return (
      <div className={styles.playerOverlay} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p>No video source available for this title.</p>
          <button onClick={onClose} className={styles.btnPrimary} style={{ marginTop: 16 }}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.playerOverlay}
      onMouseMove={resetHideTimer}
      onClick={togglePlay}
      style={{ cursor: showControls ? "default" : "none" }}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        autoPlay
        className={styles.playerVideo}
      />

      {/* Controls */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`${styles.playerControls} ${!showControls ? styles.playerControlsHidden : ""}`}
      >
        <div className={styles.playerTitle}>{item.title}</div>
        <div className={styles.progressBar} onClick={handleProgressClick}>
          <div
            className={styles.progressFill}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className={styles.playerBottom}>
          <div className={styles.playerLeft}>
            <button onClick={togglePlay} className={styles.playButton}>
              {isPlaying ? "⏸" : "▶"}
            </button>
            <span className={styles.playerTime}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <button onClick={onClose} className={styles.playerExit}>
            Exit
          </button>
        </div>
      </div>

      {/* Top-right close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className={styles.playerCloseBtn}
        style={{ opacity: showControls ? 1 : 0 }}
      >
        ✕
      </button>
    </div>
  );
}
