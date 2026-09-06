import { apiClient } from "../client";

export const reportsApi = {
  reportWeek(): Promise<any> {
    return apiClient.jget("/api/report/week");
  },
  reportMonth(month?: string): Promise<any> {
    return apiClient.jget(month ? `/api/report/month?month=${encodeURIComponent(month)}` : "/api/report/month");
  },
  months(): Promise<any> {
    return apiClient.jget("/api/months");
  },
  excelBlob(month: string): Promise<Blob> {
    return apiClient.jblob(`/api/excel?month=${encodeURIComponent(month)}`);
  },
  getHolidays(year?: number): Promise<any> {
    return apiClient.jget(year ? `/api/holidays/${year}` : "/api/holidays");
  },
};
