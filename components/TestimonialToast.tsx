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

  const rating = Math.max(0, Math.min(5, Math.round(current.rating ?? 0)));

  return (
    <>
      <aside
        className={`testimonialToast ${phase === "visible" ? "isVisible" : "isExiting"}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <button type="button" className="testimonialClose" aria-label="Dismiss testimonial for 24 hours" onClick={dismiss}>
          ×
        </button>

        <div className="testimonialTopline">
          <div className="testimonialAvatar" aria-hidden="true">
            {current.avatarUrl ? <img src={current.avatarUrl} alt="" /> : <span>{initials(current.name)}</span>}
          </div>
          <div className="testimonialIdentity">
            <strong>{current.name}</strong>
            {current.verified ? <span className="testimonialVerified">Verified Purchase</span> : null}
          </div>
        </div>

        <p className="testimonialMessage">“{current.message}”</p>

        <div className="testimonialMeta">
          {current.rating !== undefined ? (
            <span className="testimonialStars" aria-label={`${rating} out of 5 stars`}>
              {Array.from({ length: 5 }, (_, index) => (
                <span key={index} className={index < rating ? "starFilled" : "starEmpty"}>★</span>
              ))}
            </span>
          ) : null}
          <span className="testimonialDetails">
            {[current.service, current.timeLabel].filter(Boolean).join(" · ")}
          </span>
        </div>
      </aside>

      <style jsx>{`
        .testimonialToast {
          position: fixed;
          left: 50%;
          bottom: calc(env(safe-area-inset-bottom) + 92px);
          z-index: 140;
          width: min(calc(100vw - 32px), 356px);
          padding: 14px 44px 14px 14px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.82);
          -webkit-backdrop-filter: blur(22px) saturate(140%);
          backdrop-filter: blur(22px) saturate(140%);
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.72);
          color: #0a0a0a;
          pointer-events: auto;
          opacity: 0;
          transform: translate(-50%, 10px);
          transition: opacity 400ms ease, transform 400ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .testimonialToast.isVisible {
          opacity: 1;
          transform: translate(-50%, 0);
        }
        .testimonialToast.isExiting {
          opacity: 0;
          transform: translate(-50%, 8px);
        }
        .testimonialClose {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 36px;
          height: 36px;
          border: 0;
          border-radius: 18px;
          background: transparent;
          color: #6e6e73;
          font-size: 20px;
          line-height: 1;
          display: grid;
          place-items: center;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .testimonialClose:hover { background: rgba(0, 0, 0, 0.04); color: #111; }
        .testimonialClose:focus-visible { outline: 2px solid #111; outline-offset: 1px; }
        .testimonialTopline { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .testimonialAvatar {
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          border-radius: 50%;
          overflow: hidden;
          display: grid;
          place-items: center;
          background: #f2f2f4;
          border: 1px solid rgba(0, 0, 0, 0.06);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
        .testimonialAvatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .testimonialIdentity { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; min-width: 0; }
        .testimonialIdentity strong { font-size: 11px; line-height: 1.2; }
        .testimonialVerified {
          display: inline-flex;
          align-items: center;
          min-height: 20px;
          padding: 0 7px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.045);
          border: 1px solid rgba(0, 0, 0, 0.06);
          color: #4a4a4e;
          font-size: 8px;
          font-weight: 650;
          white-space: nowrap;
        }
        .testimonialMessage {
          margin: 11px 0 10px;
          font-size: 11px;
          line-height: 1.48;
          color: #1d1d1f;
        }
        .testimonialMeta { display: flex; align-items: center; gap: 8px; min-width: 0; }
        .testimonialStars { display: inline-flex; flex: 0 0 auto; gap: 1px; font-size: 10px; letter-spacing: 0.01em; }
        .starFilled { color: #111; }
        .starEmpty { color: #c7c7cc; }
        .testimonialDetails {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #6e6e73;
          font-size: 8px;
        }
        @media (min-width: 768px) {
          .testimonialToast {
            left: auto;
            right: 24px;
            bottom: 24px;
            width: min(356px, calc(100vw - 48px));
            transform: translateY(10px);
          }
          .testimonialToast.isVisible { transform: translateY(0); }
          .testimonialToast.isExiting { transform: translateY(8px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .testimonialToast { transition-duration: 1ms; }
        }
      `}</style>
    </>
  );
}
