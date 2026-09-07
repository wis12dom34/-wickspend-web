import type { ReactNode } from "react";
import BoostlyDeepLink from "./BoostlyDeepLink";

export default function BoostlyLayout({ children }: { children: ReactNode }) {
  return <><BoostlyDeepLink />{children}</>;
}
