import { motion } from "framer-motion";
import { TasksList } from "../features/tasks/TasksList";

export function TasksPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      <TasksList />
    </motion.div>
  );
}
