"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Generic IntersectionObserver based reveal animation wrapper.
 * Lightweight (no framer-motion) and production-safe (avoids hydration mismatch).
 *
 * Props:
 *  - as: element/tag to render (default: div)
 *  - delay: ms before starting animation after intersect
 *  - duration: ms transition duration (default 700)
 *  - threshold: Intersection threshold (default .15)
 *  - y / x: initial translate offsets (default y=24, x=0)
 *  - opacityFrom: starting opacity (default 0)
 *  - once: if true (default) unobserve after first reveal
 *  - className: additional classes
 *  - style: inline style override / merge
 *  - variant: preset styles (fade, fade-up, fade-down, scale, slide-left, slide-right)
 */
export function Reveal({
  as: Tag = "div",
  children,
  delay = 0,
  duration = 700,
  threshold = 0.15,
  y = 24,
  x = 0,
  opacityFrom = 0,
  once = true,
  className = "",
  style = {},
  variant = "fade-up",
  disabled = false,
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (disabled) return;
    if (visible) return; // already visible
    const node = ref.current;
    if (!node) return;

    // Respect reduced motion
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setVisible(true);
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const trigger = () => setVisible(true);
            if (delay) setTimeout(trigger, delay);
            else trigger();
            if (once) observer.disconnect();
          }
        });
      },
      { threshold }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [delay, threshold, once, disabled, visible]);

  // Variant presets (translate offsets / scale)
  const preset = (() => {
    switch (variant) {
      case "fade":
        return { init: { opacity: opacityFrom }, final: { opacity: 1 } };
      case "fade-down":
        return { init: { opacity: opacityFrom, transform: `translate3d(0,-${Math.abs(y)}px,0)` }, final: { opacity: 1, transform: "translate3d(0,0,0)" } };
      case "scale":
        return { init: { opacity: opacityFrom, transform: "scale(.95)" }, final: { opacity: 1, transform: "scale(1)" } };
      case "slide-left":
        return { init: { opacity: opacityFrom, transform: `translate3d(${Math.abs(x)}px,0,0)` }, final: { opacity: 1, transform: "translate3d(0,0,0)" } };
      case "slide-right":
        return { init: { opacity: opacityFrom, transform: `translate3d(-${Math.abs(x)}px,0,0)` }, final: { opacity: 1, transform: "translate3d(0,0,0)" } };
      case "fade-up":
      default:
        return { init: { opacity: opacityFrom, transform: `translate3d(0,${Math.abs(y)}px,0)` }, final: { opacity: 1, transform: "translate3d(0,0,0)" } };
    }
  })();

  const transition = `${duration}ms cubic-bezier(0.22,0.61,0.36,1)`;

  const baseStyle = visible ? preset.final : preset.init;

  return (
    <Tag
      ref={ref}
      style={{
        willChange: "transform, opacity",
        transition: `opacity ${transition}, transform ${transition}`,
        ...baseStyle,
        ...style,
      }}
      className={className}
      data-reveal-visible={visible ? "true" : "false"}
    >
      {children}
    </Tag>
  );
}

/** Convenience component for staggering groups */
export function RevealGroup({
  as: Wrapper = "div",
  children,
  interval = 80,
  from = 0,
  variant,
  ...rest
}) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <Wrapper {...rest}>
      {items.map((child, i) => (
        <Reveal key={i} delay={from + i * interval} variant={variant}>
          {child}
        </Reveal>
      ))}
    </Wrapper>
  );
}

export default Reveal;
