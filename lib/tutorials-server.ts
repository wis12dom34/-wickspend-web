import "server-only";
import { Tutorial, tutorialsFrom } from "@/lib/tutorials";

const API_BASE = (process.env.NEXT_PUBLIC_WICKSPEND_API_BASE || "https://n8n.wickspend.com/webhook").replace(/\/$/, "");

export async function getPublishedTutorials(): Promise<Tutorial[]> {
  try {
    const response = await fetch(`${API_BASE}/wickspend/backend/tutorials`, { next: { revalidate: 120 } });
    if (!response.ok) return [];
    return tutorialsFrom(await response.json()).filter(t => t.status === undefined || t.status === "published");
  } catch {
    return [];
  }
}
