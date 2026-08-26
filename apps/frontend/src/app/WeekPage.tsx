import { motion } from "framer-motion";
import { useToast, ToastVariant } from "../shared/ui/Toast";
import { WeekSummary } from "../features/week/WeekSummary";
import { MonthReport } from "../features/month/MonthReport";

export function WeekPage() {
  const { push } = useToast();
  const onExcel = (msg: string, variant: ToastVariant = "success") => push(msg, variant);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      <WeekSummary />
      <div style={{ height: 12 }} />
      <MonthReport onExcel={onExcel} />
    </motion.div>
  );
}
