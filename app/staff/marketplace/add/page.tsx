import MarketplaceAdmin from "@/app/admin/marketplace/MarketplaceAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function StaffAddMarketplaceProductPage(){
  return <MarketplaceAdmin mode="add" audience="staff"/>;
}
