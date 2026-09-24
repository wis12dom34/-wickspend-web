import type { ReactNode } from "react";
import StaffMarketplaceGate from "./StaffMarketplaceGate";

export default function StaffMarketplaceLayout({children}:{children:ReactNode}){
  return <StaffMarketplaceGate>{children}</StaffMarketplaceGate>;
}
