# WickSpend Web

Production frontend for WickSpend.

- Next.js / React / TypeScript
- Responsive mobile-first interface
- WickSpend API integration via `NEXT_PUBLIC_WICKSPEND_API_BASE`
- Intended deployment: Vercel
- Production branch: `main`

## Environment

Create `.env.local` from `.env.example` and configure the public WickSpend API base URL.

Never commit provider credentials, payment secrets, n8n credentials, or private API keys to this repository.
