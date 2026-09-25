import type { Metadata } from "next";
import ForgotPasswordClient from "./ForgotPasswordClient";
export const metadata: Metadata = { title: "Forgot Password", robots: { index: false, follow: true } };
export default function ForgotPasswordPage() { return <ForgotPasswordClient/>; }
