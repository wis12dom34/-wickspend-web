import type { Metadata } from "next";
import LoginClient from "../login/LoginClient";

export const metadata: Metadata = {
  title: "Create Account",
  robots: { index: false, follow: true },
};

export default function RegisterPage(){return <LoginClient initialMode="register"/>;}
