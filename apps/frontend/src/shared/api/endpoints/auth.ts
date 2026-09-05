import { apiClient } from "../client";

export const authApi = {
  authTelegramInit(): Promise<any> {
    return apiClient.jpost("/api/auth/telegram/init", {});
  },
  authPoll(token: string): Promise<any> {
    return apiClient.jget(`/api/auth/poll?token=${encodeURIComponent(token)}`);
  },
  authMe(): Promise<any> {
    return apiClient.jget("/api/auth/me");
  },
  authUpdateMe(display_name: string): Promise<any> {
    return apiClient.jpatch("/api/auth/me", { display_name });
  },
  authDeleteMe(): Promise<{ ok: boolean; message?: string }> {
    return apiClient.jdel("/api/auth/me");
  },
  authLogout(): Promise<any> {
    const rt = apiClient.getRefreshToken();
    const body = rt ? { refresh_token: rt } : {};
    return apiClient.jpost("/api/auth/logout", body).finally(() => apiClient.clearTokens());
  },
  authRefresh(refresh_token?: string): Promise<any> {
    const rt = refresh_token || apiClient.getRefreshToken();
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
      if (access) apiClient.setTokens(access, refresh || undefined);
      return j;
    });
  },
  authCheck(): Promise<any> {
    return apiClient.jget("/api/auth/check");
  },
};
