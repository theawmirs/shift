import { motion } from "framer-motion";
import { SettingsForm } from "../features/settings/SettingsForm";
import { ProfileCard } from "../features/settings/ProfileCard";

export function SettingsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      style={{ display: "grid", gap: 12 }}
    >
      <ProfileCard />
      <SettingsForm />
    </motion.div>
  );
}
