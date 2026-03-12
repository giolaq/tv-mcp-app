import { useEffect, type RefObject } from "react";

/**
 * Pauses/resumes a <video> element based on its visibility
 * via IntersectionObserver.
 */
export function useIntersectionPause(
  videoRef: RefObject<HTMLVideoElement | null>,
) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && !video.paused) {
          video.pause();
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [videoRef]);
}
