import { LoginBranding } from "@/features/auth/LoginBranding";
import { LoginForm } from "@/features/auth/LoginForm";
import { useLoginForm } from "@/features/auth/hooks/useLoginForm";

export function LoginPage({ onLogin }: { onLogin: (tokens: any, user: any) => void }) {
  const {
    phase,
    err,
    remaining,
    tgLink,
    qrData,
    mm,
    ss,
    handleInit,
    copyLink,
    reset,
  } = useLoginForm(onLogin);

  return (
    <div className="login-wrapper">
      <div className="login-container card brutal">
        <LoginBranding />
        <LoginForm
          phase={phase}
          err={err}
          remaining={remaining}
          tgLink={tgLink}
          qrData={qrData}
          mm={mm}
          ss={ss}
          onInit={handleInit}
          onCopyLink={copyLink}
          onReset={reset}
        />
      </div>
    </div>
  );
}
