import type { Testimonial } from "@/components/TestimonialToast";

// Production must contain approved WickSpend testimonials only.
// Keep this list empty until approved customer testimonials are supplied by the backend/admin flow.
export const approvedTestimonials: Testimonial[] = [];

// UI-development fixtures only. They are never exposed in production and intentionally are not marked verified.
export const developmentTestimonials: Testimonial[] = [
  {
    id: "demo-number-1",
    name: "Demo Customer",
    message: "Sample virtual-number testimonial used only to preview the social-proof UI.",
    rating: 5,
    service: "Buy Number",
    verified: false,
    timeLabel: "Demo data",
  },
  {
    id: "demo-marketplace-1",
    name: "Demo Customer",
    message: "Sample Marketplace testimonial used only during local development.",
    rating: 5,
    service: "Marketplace",
    verified: false,
    timeLabel: "Demo data",
  },
  {
    id: "demo-boostly-1",
    name: "Demo Customer",
    message: "Sample Boostly testimonial used only to validate responsive toast behavior.",
    rating: 4,
    service: "Boostly",
    verified: false,
    timeLabel: "Demo data",
  },
];
