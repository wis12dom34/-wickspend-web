"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { ApiError, api, wickspendApi } from "@/lib/api";
import styles from "../login/login.module.css";

export default function ForgotPasswordClient() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [step, setStep] = useState<"email" | "reset" | "success">("email");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sentAt, setSentAt] = useState(0);
  const lock = useRef(false);

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    if (lock.current) return;
    const normalized = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
      setMessage("Enter a valid email address."); return;
    }
    if (Date.now() - sentAt < 30000) {
      setMessage("Please wait 30 seconds before requesting another code."); return;
    }
    lock.current = true; setBusy(true); setMessage("");
    try {
      await api.auth.emailStart({ email: normalized });
      setEmail(normalized); setSentAt(Date.now()); setCode(""); setStep("reset");
      setMessage("Enter the verification code from your latest WickSpend email below. Keep this page open.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send a code. Please try again.");
    } finally { lock.current = false; setBusy(false); }
  }

  async function resetPassword(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    if (!/^\d{6}$/.test(code)) { setMessage("Enter the 6-digit verification code."); return; }
    if (password.length < 8 || password.length > 128 || new TextEncoder().encode(password).length > 72) {
      setMessage("Use at least 8 characters, up to 72 bytes, for your password."); return;
    }
    if (password !== confirm) { setMessage("Passwords do not match."); return; }
    lock.current = true; setBusy(true); setMessage("");
    try {
      const result: any = await wickspendApi("wickspend/backend/auth/password/reset", {
        method: "POST", body: JSON.stringify({ email, code, password }), timeoutMs: 20000,
        preserveSessionOn401: true,
      });
      if (result?.ok !== true || result?.password_reset !== true) throw new Error("Password reset could not be confirmed. Please try again.");
      setPassword(""); setConfirm(""); setCode(""); setStep("success");
    } catch (error) {
      const resetCode = error instanceof ApiError ? error.code : "";
      setMessage(resetCode === "INVALID_OR_EXPIRED_RESET_CODE"
        ? "That code is incorrect or expired, or no matching account was found. Request a new code or contact support."
        : resetCode === "INVALID_RESET_INPUT" ? "Check your email, 6-digit code and new password."
        : error instanceof Error ? error.message : "Unable to reset your password. Please try again.");
    } finally { lock.current = false; setBusy(false); }
  }

  return <main className={styles.screen}>
    <p className={styles.brand}>WickSpend</p>
    <section className={styles.content} aria-busy={busy}>
      <h1 className={styles.title}>{step === "success" ? "Password updated" : "Forgot password?"}</h1>
      <p className={styles.lead}>{step === "success"
        ? "Your password has been reset and previous sessions signed out. Sign in with your new password."
        : step === "email" ? "Enter your account email to receive a verification code."
        : `Enter the code sent to ${email} and choose a new password.`}</p>
      {step === "email" && <form className={styles.form} onSubmit={sendCode}>
        <label className={styles.label} htmlFor="reset-email">Email address</label>
        <input className={styles.field} id="reset-email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" disabled={busy}/>
        <button className={styles.primary} disabled={busy || !email.trim()} type="submit">{busy ? "Sending…" : "Send verification code"}</button>
      </form>}
      {step === "reset" && <form className={styles.form} onSubmit={resetPassword}>
        <label className={styles.label} htmlFor="reset-code">Verification code</label>
        <input className={styles.field} id="reset-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit code" disabled={busy}/>
        <label className={styles.label} htmlFor="new-password">New password</label>
        <input className={styles.field} id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" disabled={busy}/>
        <label className={styles.label} htmlFor="confirm-new-password">Confirm new password</label>
        <input className={styles.field} id="confirm-new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter your password" disabled={busy}/>
        <button className={styles.primary} type="submit" disabled={busy || code.length !== 6 || !password || !confirm}>{busy ? "Resetting…" : "Reset password"}</button>
        <div className={styles.verifyActions}>
          <button className={styles.helperButton} type="button" disabled={busy} onClick={() => void sendCode()}>Send new code</button>
          <button className={styles.helperButton} type="button" disabled={busy} onClick={() => { setStep("email"); setCode(""); setPassword(""); setConfirm(""); setMessage(""); }}>Change email</button>
        </div>
      </form>}
      {message && <p className={styles.message} role="status" aria-live="polite">{message}</p>}
      <Link href="/login" className={step === "success" ? styles.actionLink : styles.textLink}>{step === "success" ? "Sign in" : "Back to sign in"}</Link>
    </section>
  </main>;
}
