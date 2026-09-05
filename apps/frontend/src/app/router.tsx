import { Routes, Route } from "react-router-dom";
import { TodayPage } from "../pages/TodayPage";
import { WeekPage } from "../pages/WeekPage";
import { TasksPage } from "../pages/TasksPage";
import { SettingsPage } from "../pages/SettingsPage";
import { CalendarPage } from "../pages/CalendarPage";
import { LeavesPage } from "../pages/LeavesPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<TodayPage />} />
      <Route path="/reports" element={<WeekPage />} />
      <Route path="/week" element={<WeekPage />} />
      <Route path="/calendar" element={<CalendarPage />} />
      <Route path="/tasks" element={<TasksPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/leaves" element={<LeavesPage />} />
    </Routes>
  );
}
