import type { Testimonial } from "@/components/TestimonialToast";

// TEMPORARY PLACEHOLDER CONTENT.
// These are fictional preview-only examples and must be replaced with real backend activity before being presented as genuine transactions.
export const approvedTestimonials: Testimonial[] = [
  {
    id: "temp-john-usa-number",
    name: "John",
    message: "John just bought a USA number.",
    service: "Buy Number",
    verified: false,
    timeLabel: "Sample activity",
  },
  {
    id: "temp-john-deposit",
    name: "John",
    message: "John deposited ₦50,000.",
    service: "Wallet Funding",
    verified: false,
    timeLabel: "Sample activity",
  },
  {
    id: "temp-john-facebook",
    name: "John",
    message: "John just bought USA Facebook.",
    service: "Marketplace",
    verified: false,
    timeLabel: "Sample activity",
  },
];

export const developmentTestimonials: Testimonial[] = approvedTestimonials;
