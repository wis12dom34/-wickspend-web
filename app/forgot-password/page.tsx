import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Recover Account Access",
  robots: { index: false, follow: true },
};

export default function ForgotPasswordPage(){return <main className="seoLanding"><section className="seoLandingCard"><h1>Recover your WickSpend account</h1><p>WickSpend’s current account system supports secure email verification sign-in, but it does not currently expose a separate password-reset operation. Use the existing sign-in page, enter your email address, then choose <strong>Sign in with email verification code</strong> to regain access securely.</p><nav className="seoRelatedLinks"><Link href="/login">Continue to secure sign in</Link><Link href="/help-support">Contact support</Link></nav></section></main>;}
