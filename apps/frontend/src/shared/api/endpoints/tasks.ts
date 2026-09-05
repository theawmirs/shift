import { apiClient } from "../client";

export const tasksApi = {
  tasks(date?: string): Promise<any> {
    return apiClient.jget(date ? `/api/tasks?date=${encodeURIComponent(date)}` : "/api/tasks");
  },
  addTask(body: { title: string; description?: string | null; priority?: string; due_date?: string | null; date?: string }): Promise<any> {
    return apiClient.jpost("/api/tasks", body);
  },
  patchTask(id: number | string, body: any): Promise<any> {
    return apiClient.jpatch(`/api/tasks/${id}`, body);
  },
  delTask(id: number | string): Promise<any> {
    return apiClient.jdel(`/api/tasks/${id}`);
  },
};
