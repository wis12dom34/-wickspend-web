"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { usePathname } from "next/navigation";
import { api, newRequestKey } from "@/lib/api";
import { getSessionToken } from "@/lib/session";
import styles from "./suggestion-box.module.css";

type Category = "new_idea" | "broken" | "easier" | "other";
type SubmitState = "idle" | "submitting" | "success" | "error";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const CATEGORIES: Array<{ value: Category; icon: string; label: string }> = [
  { value: "new_idea", icon: "💡", label: "New idea" },
  { value: "broken", icon: "🐞", label: "Something’s broken" },
  { value: "easier", icon: "🙌", label: "Make it easier" },
  { value: "other", icon: "💬", label: "Something else" },
];

function sessionUserId(value: any) {
  return value?.user?.id ?? value?.data?.user?.id ?? value?.session?.user?.id ?? value?.user_id ?? value?.data?.user_id ?? "signed-in";
}

function meaningfulLength(value: string) {
  return (value.match(/[\p{L}\p{N}]/gu) || []).length;
}

function futureTime(value: unknown) {
  const parsed = value ? new Date(String(value)).getTime() : 0;
  return Number.isFinite(parsed) && parsed > Date.now() ? parsed : 0;
}

export default function SuggestionBox() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category | "">("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState("");
  const [dragY, setDragY] = useState(0);
  const storageKeyRef = useRef("wickspend_suggestion_prompt_until:signed-in");
  const seenKeyRef = useRef("wickspend_suggestion_seen_session:signed-in");
  const requestKeyRef = useRef("");
  const submittingRef = useRef(false);
  const dragStartRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let showTimer: number | null = null;

    async function prepare() {
      const token = getSessionToken();
      if (!token) return;
      try {
        const session = await api.auth.session(token);
        if (cancelled) return;
        const userId = sessionUserId(session);
        const key = `wickspend_suggestion_prompt_until:${userId}`;
        const seenKey = `wickspend_suggestion_seen_session:${userId}`;
        storageKeyRef.current = key;
        seenKeyRef.current = seenKey;
        if (sessionStorage.getItem(seenKey) === "1") return;
        const localUntil = Number(localStorage.getItem(key) || 0);
        if (Number.isFinite(localUntil) && localUntil > Date.now()) return;

        const prompt: any = await api.suggestions.prompt(token);
        if (cancelled) return;
        if (prompt?.should_show !== true) {
          const serverUntil = futureTime(prompt?.dismissed_until);
          if (serverUntil) localStorage.setItem(key, String(serverUntil));
          return;
        }
        showTimer = window.setTimeout(() => {
          if (!cancelled) {
            try { sessionStorage.setItem(seenKeyRef.current, "1"); } catch {}
            setOpen(true);
          }
        }, 1400);
      } catch {
        // Feedback is optional; never interrupt the dashboard if eligibility cannot load.
      }
    }

    void prepare();
    return () => {
      cancelled = true;
      if (showTimer) window.clearTimeout(showTimer);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submittingRef.current) void dismissForWeek();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
  }, []);

  function rememberNextWeek(until?: unknown) {
    const target = futureTime(until) || Date.now() + WEEK_MS;
    try { localStorage.setItem(storageKeyRef.current, String(target)); } catch {}
  }

  async function dismissForWeek() {
    if (submittingRef.current) return;
    rememberNextWeek();
    setOpen(false);
    setDragY(0);
    const token = getSessionToken();
    if (!token) return;
    try {
      const result: any = await api.suggestions.dismiss(token);
      rememberNextWeek(result?.dismissed_until);
    } catch {
      // Local suppression still prevents repeat prompts if the optional persistence call fails.
    }
  }

  function selectCategory(next: Category) {
    setCategory(next);
    requestKeyRef.current = "";
    if (state === "error") { setState("idle"); setError(""); }
  }

  function updateMessage(next: string) {
    setMessage(next);
    requestKeyRef.current = "";
    if (state === "error") { setState("idle"); setError(""); }
  }

  async function submit() {
    if (submittingRef.current) return;
    if (!category) {
      setState("error");
      setError("Choose a feedback type first.");
      return;
    }
    if (meaningfulLength(message.trim()) < 3) {
      setState("error");
      setError("Tell us a little more — at least 3 meaningful characters.");
      return;
    }
    const token = getSessionToken();
    if (!token) {
      setState("error");
      setError("Your session is unavailable. Sign in again and retry.");
      return;
    }

    submittingRef.current = true;
    setState("submitting");
    setError("");
    if (!requestKeyRef.current) requestKeyRef.current = newRequestKey("suggestion");

    try {
      const deviceMetadata = {
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : undefined,
        platform: typeof navigator !== "undefined" ? String(navigator.platform || "").slice(0, 120) : undefined,
        viewport: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : undefined,
      };
      const result: any = await api.suggestions.submit(token, {
        category,
        message: message.trim(),
        current_path: pathname || "/",
        device_metadata: deviceMetadata,
        request_key: requestKeyRef.current,
      });
      rememberNextWeek(result?.dismissed_until);
      setState("success");
      closeTimerRef.current = window.setTimeout(() => {
        setOpen(false);
        setCategory("");
        setMessage("");
        setState("idle");
        requestKeyRef.current = "";
      }, 1500);
    } catch {
      setState("error");
      setError("Couldn’t send that right now. Your text is still here — try again.");
    } finally {
      submittingRef.current = false;
    }
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (submittingRef.current) return;
    dragStartRef.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragStartRef.current === null) return;
    setDragY(Math.max(0, event.clientY - dragStartRef.current));
  }

  function onPointerUp() {
    if (dragStartRef.current === null) return;
    dragStartRef.current = null;
    if (dragY > 82) void dismissForWeek();
    else setDragY(0);
  }

  if (!open) return null;

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) void dismissForWeek();
    }}>
      <section
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wickspend-suggestion-title"
        style={{ transform: dragY ? `translateY(${Math.min(dragY, 180)}px)` : undefined }}
      >
        <div className={styles.dragZone} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => { dragStartRef.current = null; setDragY(0); }}>
          <span className={styles.handle} aria-hidden="true" />
        </div>

        {state === "success" ? (
          <div className={styles.successState}>
            <span className={styles.successIcon} aria-hidden="true">✓</span>
            <h2>Thanks for the feedback</h2>
            <p>We’ve received your suggestion.</p>
          </div>
        ) : (
          <>
            <header className={styles.header}>
              <div>
                <h2 id="wickspend-suggestion-title"><span aria-hidden="true">💡</span> Suggestion Box</h2>
                <p>Help us make WickSpend better</p>
              </div>
              <button className={styles.close} type="button" onClick={() => void dismissForWeek()} aria-label="Close suggestion box">×</button>
            </header>

            <p className={styles.intro}>What should we add, fix or change? Tell us straight.<br />We read every suggestion.</p>

            <div className={styles.categories} role="group" aria-label="Feedback type">
              {CATEGORIES.map((item) => (
                <button
                  type="button"
                  key={item.value}
                  className={`${styles.category} ${category === item.value ? styles.categorySelected : ""}`}
                  aria-pressed={category === item.value}
                  onClick={() => selectCategory(item.value)}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <b>{item.label}</b>
                </button>
              ))}
            </div>

            <label className={styles.messageLabel} htmlFor="wickspend-suggestion-message">Your suggestion</label>
            <div className={styles.textareaWrap}>
              <textarea
                id="wickspend-suggestion-message"
                maxLength={500}
                value={message}
                onChange={(event) => updateMessage(event.target.value)}
                placeholder="Your idea..."
                disabled={state === "submitting"}
              />
              <span className={styles.counter}>{message.length}/500</span>
            </div>

            {error && <div className={styles.error} role="alert">{error}</div>}

            <div className={styles.actions}>
              <button type="button" className={styles.secondary} onClick={() => void dismissForWeek()} disabled={state === "submitting"}>Not now</button>
              <button type="button" className={styles.primary} onClick={() => void submit()} disabled={state === "submitting"}>
                {state === "submitting" ? <><span className={styles.spinner} aria-hidden="true" />Sending…</> : state === "error" ? "Retry" : "Send"}
              </button>
            </div>

            <p className={styles.footer}>We’ll ask again next week. Need help with your account? <a href="https://wa.me/message/MDKOFBPFKEZZE1" target="_blank" rel="noreferrer">Contact support</a></p>
          </>
        )}
      </section>
    </div>
  );
}
