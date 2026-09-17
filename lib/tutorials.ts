export type TutorialStatus = "draft" | "published" | "hidden";

export type Tutorial = {
  id: string | number;
  title: string;
  description?: string | null;
  video_url: string;
  thumbnail_url?: string | null;
  duration?: string | null;
  status?: TutorialStatus;
  sort_order?: number;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export function tutorialsFrom(payload: unknown): Tutorial[] {
  if (Array.isArray(payload)) return payload as Tutorial[];
  if (!payload || typeof payload !== "object") return [];
  const value = payload as Record<string, unknown>;
  if (Array.isArray(value.tutorials)) return value.tutorials as Tutorial[];
  const data = value.data;
  if (data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).tutorials)) {
    return (data as Record<string, unknown>).tutorials as Tutorial[];
  }
  return [];
}

export function tutorialDate(tutorial: Tutorial): string | null {
  return tutorial.updated_at || tutorial.published_at || tutorial.created_at || null;
}

export function formatTutorialDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}
