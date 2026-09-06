export interface ApiResponse {
  [key: string]: any;
}

class ApiClient {
  private _token: string | null = null;
  private _refreshToken: string | null = null;
  private _refreshPromise: Promise<{ access: string; refresh?: string }> | null = null;
  private _onUnauthorized: (() => void) | null = null;

  setOnUnauthorized(cb: (() => void) | null) {
    this._onUnauthorized = cb;
  }

  triggerUnauthorized() {
    this.clearTokens();
    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(new CustomEvent("wt:unauthorized"));
      } catch {}
    }
    if (this._onUnauthorized) {
      try {
        this._onUnauthorized();
      } catch {}
    }
  }

  setToken(t: string | null) {
    this._token = t;
  }

  getToken(): string | null {
    return this._token;
  }

  setRefreshToken(t: string | null) {
    this._refreshToken = t;
    try {
      if (t) localStorage.setItem("wt-refresh-token", t);
      else localStorage.removeItem("wt-refresh-token");
    } catch {}
  }

  getRefreshToken(): string | null {
    if (this._refreshToken) return this._refreshToken;
    try {
      const v = localStorage.getItem("wt-refresh-token");
      if (v) this._refreshToken = v;
      return v;
    } catch {
      return null;
    }
  }

  setTokens(access: string | null, refresh?: string | null) {
    this.setToken(access);
    if (refresh) this.setRefreshToken(refresh);
    try {
      if (access) localStorage.setItem("wt-token", access);
      else localStorage.removeItem("wt-token");
      if (refresh) localStorage.setItem("wt-refresh-token", refresh);
    } catch {}
  }

  clearTokens() {
    this._token = null;
    this._refreshToken = null;
    try {
      localStorage.removeItem("wt-token");
      localStorage.removeItem("wt-refresh-token");
    } catch {}
  }

  async _doRefresh(): Promise<{ access: string; refresh?: string }> {
    const rt = this.getRefreshToken();
    if (!rt) throw new Error("no refresh token");
    // single flight: concurrent 401s share one promise
    if (this._refreshPromise) return this._refreshPromise;
    this._refreshPromise = (async () => {
      try {
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
      } catch (err) {
        throw err;
      }
    })();
    try {
      return await this._refreshPromise;
    } finally {
      this._refreshPromise = null;
    }
  }

  _headers(json = false): Record<string, string> {
    const h: Record<string, string> = {};
    const t = this.getToken();
    if (t) h["Authorization"] = `Bearer ${t}`;
    if (json) h["Content-Type"] = "application/json";
    h["Accept"] = "application/json";
    return h;
  }

  async _fetchWithRefresh(url: string, init: RequestInit, retry = true): Promise<Response> {
    if (String(url).includes("/api/auth/refresh")) retry = false;
    let r = await fetch(url, init);
    if (r.status === 401 && retry) {
      try {
        const { access } = await this._doRefresh();
        const existingHeaders = (init.headers as Record<string, string>) || {};
        const h2 = { ...existingHeaders, Authorization: `Bearer ${access}` };
        r = await fetch(url, { ...init, headers: h2 });
      } catch (e: any) {
        const msg = String(e?.message || "");
        // If refresh failed because refresh token was rejected/invalid/expired/not found:
        if (
          msg.includes("باطل") ||
          msg.includes("منقضی") ||
          msg.includes("invalid") ||
          msg.includes("revoked") ||
          msg.includes("not found") ||
          msg.includes("no refresh token") ||
          msg.includes("401")
        ) {
          this.triggerUnauthorized();
        }
        // If it's a temporary network glitch, do NOT force logout immediately
      }
    }
    return r;
  }

  async jget<T = any>(path: string): Promise<T> {
    const r = await this._fetchWithRefresh(path, { headers: this._headers() });
    if (!r.ok) {
      if (r.status === 401) {
        this.triggerUnauthorized();
      }
      const t = await r.text();
      throw new Error(t || r.statusText);
    }
    const ct = r.headers.get("content-type") || "";
    return ct.includes("application/json") ? r.json() : (r.text() as any);
  }

  async jpost<T = any>(path: string, body: any): Promise<T> {
    const r = await this._fetchWithRefresh(path, {
      method: "POST",
      headers: this._headers(true),
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      if (r.status === 401 && !path.includes("/api/auth/telegram") && !path.includes("/api/auth/poll")) {
        this.triggerUnauthorized();
      }
      const t = await r.text();
      let msg = t;
      try {
        const j = JSON.parse(t);
        msg = j.detail || j.message || t;
      } catch {}
      throw new Error(msg);
    }
    return r.json();
  }

  async jput<T = any>(path: string, body: any): Promise<T> {
    const r = await this._fetchWithRefresh(path, {
      method: "PUT",
      headers: this._headers(true),
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      if (r.status === 401) {
        this.triggerUnauthorized();
      }
      const t = await r.text();
      let msg = t;
      try {
        const j = JSON.parse(t);
        msg = j.detail || t;
      } catch {}
      throw new Error(msg);
    }
    return r.json();
  }

  async jpatch<T = any>(path: string, body: any): Promise<T> {
    const r = await this._fetchWithRefresh(path, {
      method: "PATCH",
      headers: this._headers(true),
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      if (r.status === 401) {
        this.triggerUnauthorized();
      }
      const t = await r.text();
      let msg = t;
      try {
        const j = JSON.parse(t);
        msg = j.detail || t;
      } catch {}
      throw new Error(msg);
    }
    return r.json();
  }

  async jdel<T = any>(path: string): Promise<T> {
    const r = await this._fetchWithRefresh(path, { method: "DELETE", headers: this._headers() });
    if (!r.ok) {
      if (r.status === 401) {
        this.triggerUnauthorized();
      }
      const t = await r.text();
      let msg = t;
      try {
        const j = JSON.parse(t);
        msg = j.detail || t;
      } catch {}
      throw new Error(msg);
    }
    return r.json();
  }

  async jblob(path: string): Promise<Blob> {
    const r = await this._fetchWithRefresh(path, { headers: this._headers() });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(t || r.statusText);
    }
    return r.blob();
  }
}

export const apiClient = new ApiClient();
