import { apiClient } from "../client";

export const settingsApi = {
  getSettings(): Promise<any> {
    return apiClient.jget("/api/settings");
  },
  putSetting(key: string, value: any): Promise<any> {
    return apiClient.jput("/api/settings", { key, value });
  },
  csvExportBlob(month?: string): Promise<Blob> {
    return apiClient.jblob(month ? `/api/data/export/csv?month=${encodeURIComponent(month)}` : "/api/data/export/csv");
  },
  csvSampleBlob(): Promise<Blob> {
    return apiClient.jblob("/api/data/sample/csv");
  },
  async csvImport(file: File, mode: "upsert" | "skip" = "upsert"): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);

    const headers: Record<string, string> = {};
    const token = apiClient.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const r = await apiClient._fetchWithRefresh("/api/data/import/csv", {
      method: "POST",
      headers,
      body: formData,
    });
    if (!r.ok) {
      let msg = r.statusText;
      try {
        const j = await r.json();
        msg = j.detail || j.message || msg;
      } catch {}
      throw new Error(msg);
    }
    return r.json();
  },
};
