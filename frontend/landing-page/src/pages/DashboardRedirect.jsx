import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

// Entry gate for a URL like /dashboard on the marketing site. It never
// shows a dashboard itself — the real dashboard is a separate app on a
// separate origin. This just decides where to send the visitor:
// returning (has authenticated on this browser before) -> /login
// everyone else -> / (home), never straight to /signup
export default function DashboardRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const hasAuthenticatedBefore = localStorage.getItem("dann_has_authenticated") === "true";
    navigate(hasAuthenticatedBefore ? "/login" : "/", { replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-[100svh] w-full flex-col items-center justify-center gap-3">
      <Loader2 className="animate-spin text-stamp" size={28} />
    </div>
  );
}