export interface ApiResponse {
  [key: string]: any;
}

export const API = {
  _token: null as string | null,
  _refreshToken: null as string | null,
  _refreshPromise: null as Promise<{ access: string; refresh?: string }> | null,

  setToken(t: string | null) {
    this._token = t;
  },
  getToken(): string | null {
    return this._token;
  },
  setRefreshToken(t: string | null) {
    this._refreshToken = t;
    try {
      if (t) localStorage.setItem("wt-refresh-token", t);
      else localStorage.removeItem("wt-refresh-token");
    } catch {}
  },
  getRefreshToken(): string | null {
    if (this._refreshToken) return this._refreshToken;
    try {
      const v = localStorage.getItem("wt-refresh-token");
      if (v) this._refreshToken = v;
      return v;
    } catch {
      return null;
    }
  },
  setTokens(access: string | null, refresh?: string | null) {
    this.setToken(access);
    if (refresh) this.setRefreshToken(refresh);
    try {
      if (access) localStorage.setItem("wt-token", access);
      else localStorage.removeItem("wt-token");
      if (refresh) localStorage.setItem("wt-refresh-token", refresh);
    } catch {}
  },
  clearTokens() {
    this._token = null;
    this._refreshToken = null;
    try {
      localStorage.removeItem("wt-token");
      localStorage.removeItem("wt-refresh-token");
    } catch {}
  },
  async _doRefresh(): Promise<{ access: string; refresh?: string }> {
    const rt = this.getRefreshToken();
    if (!rt) throw new Error("no refresh token");
    // single flight: concurrent 401s share one promise
    if (this._refreshPromise) return this._refreshPromise;
    this._refreshPromise = (async () => {
      const r = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ refresh_token: rt }),
      });
      if (!r.ok) {
        const t = await r.text();
        let msg = t;
        try {
          const j = JSON.parse(t);
          msg = j.detail || j.message || t;
        } catch {}
        throw new Error(msg || r.statusText);
      }
      const j = await r.json();
      const access = j.access_token || j.jwt || j.accessToken;
      const refresh = j.refresh_token || j.refreshToken;
      if (!access) throw new Error("refresh: no access_token");
      this.setTokens(access, refresh || undefined);
      return { access, refresh };
    })();
    try {
      return await this._refreshPromise;
    } finally {
      this._refreshPromise = null;
    }
  },
  _headers(json = false): Record<string, string> {
    const h: Record<string, string> = {};
    if (this._token) h["Authorization"] = `Bearer ${this._token}`;
    if (json) h["Content-Type"] = "application/json";
    h["Accept"] = "application/json";
    return h;
  },
  async _fetchWithRefresh(url: string, init: RequestInit, retry = true): Promise<Response> {
    if (String(url).includes("/api/auth/refresh")) retry = false;
    let r = await fetch(url, init);
    if (r.status === 401 && retry) {
      try {
        const { access } = await this._doRefresh();
        const h2 = { ...(init.headers || {}), Authorization: `Bearer ${access}` };
        r = await fetch(url, { ...init, headers: h2 });
      } catch (e: any) {
        // refresh failed → clear and propagate original 401
        if (
          String(e?.message || "").includes("refresh") ||
          String(e?.message || "").includes("401") ||
          String(e?.message || "").includes("باطل") ||
          String(e?.message || "").includes("منقضی")
        ) {
          this.clearTokens();
        }
        // fall through to throw below with original r
      }
    }
    return r;
  },
  async jget<T = any>(path: string): Promise<T> {
    const r = await this._fetchWithRefresh(path, { headers: this._headers() });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(t || r.statusText);
    }
    const ct = r.headers.get("content-type") || "";
    return ct.includes("application/json") ? r.json() : (r.text() as any);
  },
  async jpost<T = any>(path: string, body: any): Promise<T> {
    const r = await this._fetchWithRefresh(path, {
      method: "POST",
      headers: this._headers(true),
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const t = await r.text();
      let msg = t;
      try {
        const j = JSON.parse(t);
        msg = j.detail || j.message || t;
      } catch {}
      throw new Error(msg);
    }
    return r.json();
  },
  async jput<T = any>(path: string, body: any): Promise<T> {
    const r = await this._fetchWithRefresh(path, {
      method: "PUT",
      headers: this._headers(true),
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const t = await r.text();
      let msg = t;
      try {
        const j = JSON.parse(t);
        msg = j.detail || t;
      } catch {}
      throw new Error(msg);
    }
    return r.json();
  },
  async jpatch<T = any>(path: string, body: any): Promise<T> {
    const r = await this._fetchWithRefresh(path, {
      method: "PATCH",
      headers: this._headers(true),
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const t = await r.text();
      let msg = t;
      try {
        const j = JSON.parse(t);
        msg = j.detail || t;
      } catch {}
      throw new Error(msg);
    }
    return r.json();
  },
  async jdel<T = any>(path: string): Promise<T> {
    const r = await this._fetchWithRefresh(path, { method: "DELETE", headers: this._headers() });
    if (!r.ok) {
      const t = await r.text();
      let msg = t;
      try {
        const j = JSON.parse(t);
        msg = j.detail || t;
      } catch {}
      throw new Error(msg);
    }
    return r.json();
  },
  async jblob(path: string): Promise<Blob> {
    const r = await this._fetchWithRefresh(path, { headers: this._headers() });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(t || r.statusText);
    }
    return r.blob();
  },

  // ── Auth (Telegram) ──
  authTelegramInit(): Promise<any> {
    return this.jpost("/api/auth/telegram/init", {});
  },
  authPoll(token: string): Promise<any> {
    return this.jget(`/api/auth/poll?token=${encodeURIComponent(token)}`);
  },
  authMe(): Promise<any> {
    return this.jget("/api/auth/me");
  },
  authUpdateMe(display_name: string): Promise<any> {
    return this.jpatch("/api/auth/me", { display_name });
  },
  authLogout(): Promise<any> {
    const rt = this.getRefreshToken();
    const body = rt ? { refresh_token: rt } : {};
    return this.jpost("/api/auth/logout", body).finally(() => this.clearTokens());
  },
  authRefresh(refresh_token?: string): Promise<any> {
    const rt = refresh_token || this.getRefreshToken();
    return fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refresh_token: rt }),
    }).then(async (r) => {
      if (!r.ok) {
        const t = await r.text();
        throw new Error(t);
      }
      const j = await r.json();
      const access = j.access_token || j.jwt;
      const refresh = j.refresh_token || j.refreshToken;
      if (access) this.setTokens(access, refresh || undefined);
      return j;
    });
  },
  authCheck(): Promise<any> {
    return this.jget("/api/auth/check");
  },

  // status/report
  status(): Promise<any> {
    return this.jget("/api/status");
  },
  dayStatus(s: any): { day_status: string | null; day_status_label: string | null; day_status_reason: string | null } {
    if (!s) return { day_status: null, day_status_label: null, day_status_reason: null };
    return {
      day_status: s.day_status ?? s.day?.day_status ?? null,
      day_status_label: s.day_status_label ?? s.day?.day_status_label ?? null,
      day_status_reason: s.day_status_reason ?? s.day?.day_status_reason ?? null,
    };
  },
  reportWeek(): Promise<any> {
    return this.jget("/api/report/week");
  },
  reportMonth(month?: string): Promise<any> {
    return this.jget(month ? `/api/report/month?month=${encodeURIComponent(month)}` : "/api/report/month");
  },

  // ── Daily leaves (spec-04) ──
  listDailyLeaves(opts: { month?: string; date?: string } = {}): Promise<any> {
    const qs = new URLSearchParams();
    if (opts.month) qs.set("month", opts.month);
    if (opts.date) qs.set("date", opts.date);
    const q = qs.toString() ? `?${qs}` : "";
    return this.jget(`/api/daily-leaves${q}`);
  },
  createDailyLeave({
    date,
    end_date,
    type,
    reason,
  }: {
    date: string;
    end_date?: string;
    type?: string;
    reason?: string;
  }): Promise<any> {
    return this.jpost("/api/daily-leaves", { date, end_date, type, reason });
  },
  deleteDailyLeave(id: number | string): Promise<any> {
    return this.jdel(`/api/daily-leaves/${id}`);
  },
  months(): Promise<any> {
    return this.jget("/api/months");
  },
  excelBlob(month: string): Promise<Blob> {
    return this.jblob(`/api/excel?month=${encodeURIComponent(month)}`);
  },
  toggleWorkMode(date?: string): Promise<any> {
    return this.jpost("/api/work-mode/toggle", date ? { date } : {});
  },

  // tasks
  tasks(date?: string): Promise<any> {
    return this.jget(date ? `/api/tasks?date=${encodeURIComponent(date)}` : "/api/tasks");
  },
  addTask(title: string, date?: string): Promise<any> {
    return this.jpost("/api/tasks", { title, date });
  },
  patchTask(id: number | string, body: any): Promise<any> {
    return this.jpatch(`/api/tasks/${id}`, body);
  },
  delTask(id: number | string): Promise<any> {
    return this.jdel(`/api/tasks/${id}`);
  },

  // records
  record(event_type: string, at?: string, date?: string): Promise<any> {
    return this.jpost("/api/record", { event_type, at, date });
  },
  ot(hours: number | string, date?: string): Promise<any> {
    return this.jpost(
      `/api/ot?hours=${encodeURIComponent(hours)}${date ? `&date=${encodeURIComponent(date)}` : ""}`,
      {}
    );
  },

  // settings
  getSettings(): Promise<any> {
    return this.jget("/api/settings");
  },
  putSetting(key: string, value: any): Promise<any> {
    return this.jput("/api/settings", { key, value });
  },

  // holidays
  getHolidays(year?: number): Promise<any> {
    return this.jget(year ? `/api/holidays/${year}` : "/api/holidays");
  },

  // ── CSV Import / Export ──
  csvExportBlob(month?: string): Promise<Blob> {
    return this.jblob(month ? `/api/data/export/csv?month=${encodeURIComponent(month)}` : "/api/data/export/csv");
  },
  csvSampleBlob(): Promise<Blob> {
    return this.jblob("/api/data/sample/csv");
  },
  async csvImport(file: File, mode: "upsert" | "skip" = "upsert"): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);

    const headers: Record<string, string> = {};
    const token = this.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const r = await this._fetchWithRefresh("/api/data/import/csv", {
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
