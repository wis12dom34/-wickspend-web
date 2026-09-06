import type { Testimonial } from "@/components/TestimonialToast";

// TEMPORARY PLACEHOLDER CONTENT.
// These entries are fictional UI/social-proof placeholders requested for the current preview.
// They MUST be replaced with approved customer testimonials / backend transaction data before being represented as real activity.
export const approvedTestimonials: Testimonial[] = [
  { id: "temp-1", name: "David K.", message: "Got my WhatsApp number quickly and the OTP came through.", rating: 5, service: "WhatsApp Number", verified: false, timeLabel: "Sample activity" },
  { id: "temp-2", name: "Tobi A.", message: "Funding was smooth and my balance updated fast.", rating: 5, service: "Wallet Funding", verified: false, timeLabel: "Sample activity" },
  { id: "temp-3", name: "Mariam O.", message: "Telegram number worked well for my verification.", rating: 5, service: "Telegram Number", verified: false, timeLabel: "Sample activity" },
  { id: "temp-4", name: "Kelvin C.", message: "Boostly order was easy to place and started quickly.", rating: 5, service: "Boostly", verified: false, timeLabel: "Sample activity" },
  { id: "temp-5", name: "Sarah M.", message: "Found the account I needed in Marketplace without stress.", rating: 5, service: "Marketplace", verified: false, timeLabel: "Sample activity" },
  { id: "temp-6", name: "Emeka N.", message: "Instagram OTP arrived faster than I expected.", rating: 5, service: "Instagram Number", verified: false, timeLabel: "Sample activity" },
  { id: "temp-7", name: "Daniel P.", message: "Simple checkout and everything worked smoothly.", rating: 5, service: "Buy Number", verified: false, timeLabel: "Sample activity" },
  { id: "temp-8", name: "Aisha B.", message: "Temp Mail was quick and easy to use.", rating: 4, service: "Temp Mail", verified: false, timeLabel: "Sample activity" },
  { id: "temp-9", name: "Chris E.", message: "Bought another number today. Very straightforward.", rating: 5, service: "Virtual Number", verified: false, timeLabel: "Sample activity" },
  { id: "temp-10", name: "Favour J.", message: "The wallet and purchase flow was really easy.", rating: 5, service: "Wallet", verified: false, timeLabel: "Sample activity" },
];

// Local development uses the same clearly fictional placeholder set for now.
export const developmentTestimonials: Testimonial[] = approvedTestimonials;
