"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Testimonial = {
  id: string;
  name: string;
  message: string;
  rating?: number;
  service?: string;
  verified?: boolean;
  timeLabel?: string;
  avatarUrl?: string;
};

type TestimonialToastProps = {
  testimonials: Testimonial[];
};

const STORAGE_KEY = "wickspend-testimonials-hidden-until";
const HIDDEN_FOR_MS = 24 * 60 * 60 * 1000;
const EXIT_MS = 400;

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "W") + (parts[1]?.[0] ?? "");
}

export function TestimonialToast({ testimonials }: TestimonialToastProps) {
  const [current, setCurrent] = useState<Testimonial | null>(null);
  const [phase, setPhase] = useState<"hidden" | "visible" | "exiting">("hidden");
  const [dismissed, setDismissed] = useState(false);
  const indexRef = useRef(-1);
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }, []);

  const queue = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, delay);
    timersRef.current.push(timer);
    return timer;
  }, []);

  const pickNext = useCallback(() => {
    if (!testimonials.length) return null;
    if (testimonials.length === 1) {
      indexRef.current = 0;
      return testimonials[0];
    }

    let next = indexRef.current;
    while (next === indexRef.current) next = randomBetween(0, testimonials.length - 1);
    indexRef.current = next;
    return testimonials[next];
  }, [testimonials]);

  useEffect(() => {
    clearTimers();
    setCurrent(null);
    setPhase("hidden");
    setDismissed(false);

    if (!testimonials.length) return;

    try {
      const hiddenUntil = Number(window.localStorage.getItem(STORAGE_KEY) ?? 0);
      if (Number.isFinite(hiddenUntil) && hiddenUntil > Date.now()) {
        setDismissed(true);
        return;
      }
      if (hiddenUntil) window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage can be unavailable in privacy-restricted browser contexts.
    }

    let stopped = false;

    const scheduleNext = (delay: number) => {
      queue(() => {
        if (stopped) return;
        const next = pickNext();
        if (!next) return;

        setCurrent(next);
        setPhase("visible");

        queue(() => {
          if (stopped) return;
          setPhase("exiting");

          queue(() => {
            if (stopped) return;
            setCurrent(null);
            setPhase("hidden");
            scheduleNext(randomBetween(15_000, 30_000));
          }, EXIT_MS);
        }, randomBetween(5_000, 7_000));
      }, delay);
    };

    scheduleNext(2_000);

    return () => {
      stopped = true;
      clearTimers();
    };
  }, [clearTimers, pickNext, queue, testimonials]);

  const dismiss = useCallback(() => {
    clearTimers();
    setDismissed(true);
    setPhase("exiting");
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now() + HIDDEN_FOR_MS));
    } catch {
      // Dismiss for this page lifetime even if storage is unavailable.
    }
    queue(() => {
      setCurrent(null);
      setPhase("hidden");
    }, EXIT_MS);
  }, [clearTimers, queue]);

  if (!current || dismissed && phase === "hidden") return null;

  return (
    <>
      <aside
        className={`testimonialToast ${phase === "visible" ? "isVisible" : "isExiting"}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <button type="button" className="testimonialClose" aria-label="Dismiss social proof for 24 hours" onClick={dismiss}>
          ×
        </button>

        <div className="testimonialAvatar" aria-hidden="true">
          {current.avatarUrl ? <img src={current.avatarUrl} alt="" /> : <span>{initials(current.name)}</span>}
        </div>

        <div className="testimonialBody">
          <strong>{current.name}</strong>
          <p>{current.message}</p>
          <span>{[current.service, current.timeLabel].filter(Boolean).join(" · ")}</span>
        </div>
      </aside>

      <style jsx>{`
        .testimonialToast {
          position: fixed;
          top: calc(env(safe-area-inset-top) + 14px);
          right: 12px;
          z-index: 140;
          width: min(260px, calc(100vw - 72px));
          min-height: 58px;
          padding: 10px 34px 10px 10px;
          display: flex;
          align-items: flex-start;
          gap: 9px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.86);
          -webkit-backdrop-filter: blur(20px) saturate(140%);
          backdrop-filter: blur(20px) saturate(140%);
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.11), inset 0 1px 0 rgba(255, 255, 255, 0.76);
          color: #0a0a0a;
          pointer-events: auto;
          opacity: 0;
          transform: translateY(-8px) scale(0.98);
          transform-origin: top right;
          transition: opacity 400ms ease, transform 400ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .testimonialToast.isVisible {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        .testimonialToast.isExiting {
          opacity: 0;
          transform: translateY(-6px) scale(0.98);
        }
        .testimonialClose {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 28px;
          height: 28px;
          border: 0;
          border-radius: 14px;
          background: transparent;
          color: #6e6e73;
          font-size: 17px;
          line-height: 1;
          display: grid;
          place-items: center;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .testimonialClose:hover { background: rgba(0, 0, 0, 0.04); color: #111; }
        .testimonialClose:focus-visible { outline: 2px solid #111; outline-offset: 1px; }
        .testimonialAvatar {
          width: 32px;
          height: 32px;
          flex: 0 0 32px;
          border-radius: 50%;
          overflow: hidden;
          display: grid;
          place-items: center;
          background: #f2f2f4;
          border: 1px solid rgba(0, 0, 0, 0.06);
          font-size: 10px;
          font-weight: 700;
        }
        .testimonialAvatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .testimonialBody { min-width: 0; padding-top: 1px; }
        .testimonialBody strong {
          display: block;
          font-size: 10px;
          line-height: 1.2;
          margin-bottom: 3px;
        }
        .testimonialBody p {
          margin: 0;
          color: #1d1d1f;
          font-size: 10px;
          line-height: 1.35;
        }
        .testimonialBody span {
          display: block;
          margin-top: 4px;
          color: #77777c;
          font-size: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        @media (min-width: 768px) {
          .testimonialToast {
            top: 20px;
            right: 20px;
            width: 280px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .testimonialToast { transition-duration: 1ms; }
        }
      `}</style>
    </>
  );
}
