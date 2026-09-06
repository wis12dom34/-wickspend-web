"use client";

import { usePathname } from "next/navigation";
import { TestimonialToast } from "@/components/TestimonialToast";
import { approvedTestimonials, developmentTestimonials } from "@/data/testimonials";

const HIDDEN_ROUTE_PREFIXES = [
  "/login",
  "/signup",
  "/auth",
  "/checkout",
];

function isHiddenRoute(pathname: string) {
  return HIDDEN_ROUTE_PREFIXES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function AppTestimonials() {
  const pathname = usePathname();

  if (isHiddenRoute(pathname)) return null;

  // Never ship demo social proof to customers. Production remains empty until approved data is supplied.
  const testimonials = process.env.NODE_ENV === "production"
    ? approvedTestimonials
    : approvedTestimonials.length
      ? approvedTestimonials
      : developmentTestimonials;

  return <TestimonialToast testimonials={testimonials} />;
}
