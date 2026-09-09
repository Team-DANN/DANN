import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useOnboarding } from "../../context/OnboardingContext.jsx";

const steps = [
  { path: "owner-name", label: "You" },
  { path: "business-name", label: "Business" },
  { path: "business-type", label: "Type" },
  { path: "country", label: "Location" },
];

export default function OnboardingLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { draft } = useOnboarding();

  const currentStepIndex = steps.findIndex((step) =>
    location.pathname.endsWith(step.path)
  );
  const isCompleteScreen = location.pathname.endsWith("complete");

  useEffect(() => {
    if (!draft.email) {
      navigate("/signup", { replace: true });
    }
  }, [draft.email, navigate]);

  if (!draft.email) return null;

  return (
    <div className="flex min-h-[100svh] w-full items-center justify-center bg-paper px-6 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-border p-8 sm:p-10">
        {!isCompleteScreen && (
          <div className="mb-8 flex items-center justify-center gap-2">
            {steps.map((step, index) => (
              <span
                key={step.path}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  index <= currentStepIndex ? "bg-stamp" : "bg-border"
                }`}
              />
            ))}
          </div>
        )}
        <Outlet />
      </div>
    </div>
  );
}