import { useToast, ToastVariant } from "../shared/ui/Toast";
import { WeekSummary } from "../features/week/WeekSummary";
import { MonthReport } from "../features/month/MonthReport";

export function WeekPage() {
  const { push } = useToast();
  const onExcel = (msg: string, variant: ToastVariant = "success") => push(msg, variant);
  return (
    <div className="page-fade">
      <WeekSummary />
      <div style={{ height: 12 }} />
      <MonthReport onExcel={onExcel} />
    </div>
  );
}
