import type { ReactNode } from "react";
import BoostlyDeepLink from "./BoostlyDeepLink";
import "./boostly-theme.css";

export default function BoostlyLayout({ children }: { children: ReactNode }) {
  return <div className="boostlyTheme"><BoostlyDeepLink />{children}</div>;
}
