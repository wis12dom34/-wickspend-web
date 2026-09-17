import { wickspendApi } from "@/lib/api";

function query(params: Record<string, string | number | undefined> = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  return search.toString();
}

export const tutorialsApi = {
  list(params: Record<string, string | number | undefined> = {}) {
    const search = query(params);
    return wickspendApi(`wickspend/backend/tutorials${search ? `?${search}` : ""}`);
  },
  detail(id: string | number) {
    return wickspendApi(`wickspend/backend/tutorials?id=${encodeURIComponent(String(id))}`);
  },
};

export const adminTutorialsApi = {
  list(token: string) {
    return wickspendApi("wickspend/backend/admin/tutorials", { token, preserveSessionOn401: true });
  },
  mutate(token: string, body: Record<string, unknown>) {
    return wickspendApi("wickspend/backend/admin/tutorials", {
      method: "POST",
      token,
      preserveSessionOn401: true,
      body: JSON.stringify(body),
    });
  },
};
