import { SettingsForm } from "../features/settings/SettingsForm";
import { ProfileCard } from "../features/settings/ProfileCard";
import { DataTransferCard } from "../features/settings/DataTransferCard";
import { useQueryClient } from "@tanstack/react-query";

export function SettingsPage() {
  const queryClient = useQueryClient();

  const handleRefreshData = () => {
    queryClient.invalidateQueries();
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
    
      <ProfileCard />
      <SettingsForm />
      <DataTransferCard onImportSuccess={handleRefreshData} />
    </div>
  );
}
