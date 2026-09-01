"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Tracks whether a DOM element is within (or near) the viewport, via
 * IntersectionObserver. Used to pause expensive per-frame work (canvas/WebGL
 * render loops, marquee animations) while a section is scrolled off-screen.
 *
 * `rootMargin` lets the caller start/stop slightly before the element is
 * strictly visible, so animations resume before a jarring pop-in.
 */
export function useInViewport(
  targetRef: RefObject<Element | null>,
  rootMargin = "200px",
  initial = false
): boolean {
  const [isVisible, setIsVisible] = useState(initial);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    // One-time browser-capability fallback (no IntersectionObserver support),
    // not state derivable from props.
    if (typeof IntersectionObserver === "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [targetRef, rootMargin]);

  return isVisible;
}
