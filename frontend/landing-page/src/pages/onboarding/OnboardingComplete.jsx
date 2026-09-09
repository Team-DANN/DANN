import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { useOnboarding } from "../../context/OnboardingContext.jsx";
import { API_BASE_URL } from "../../lib/config.js";

export default function OnboardingComplete() {
  const navigate = useNavigate();
  const { draft, clearDraft } = useOnboarding();
  const [status, setStatus] = useState("submitting");
  const [errorMessage, setErrorMessage] = useState("");
  const hasSubmitted = useRef(false);

  useEffect(() => {
    if (hasSubmitted.current) return;
    hasSubmitted.current = true;

    const register = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: draft.ownerName,
            email: draft.email,
            password: draft.password,
            business_name: draft.businessName,
            // "Other" stores the free-text label as the type instead of
            // the literal word "other" — nothing downstream needs to know
            // this came from the custom-text branch of the step.
            type: draft.businessType === "other" ? draft.businessTypeCustom : draft.businessType,
            country: draft.country,
            currency: draft.currency,
            timezone: draft.timezone,
          }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "Something went wrong creating your account.");
        }

        const { data } = await response.json();
        const token = data?.token;

        if (!token) {
          throw new Error("No token returned from server.");
        }

        clearDraft();
        localStorage.setItem("dann_has_authenticated", "true");
        window.location.href = `/dashboard/auth/callback?token=${encodeURIComponent(token)}`;
      } catch (error) {
        setStatus("error");
        setErrorMessage(error.message);
      }
    };

    register();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "error") {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
          <AlertCircle size={26} className="text-error" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Couldn't create your account
        </h1>
        <p className="mt-3 text-base text-ink-muted">{errorMessage}</p>
        <button
          type="button"
          onClick={() => navigate("/onboarding/country")}
          className="mt-6 w-full rounded-2xl bg-stamp px-5 py-3.5 text-base font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-stamp-dark hover:shadow-lg hover:shadow-stamp/25"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-6 text-center">
      <Loader2 size={28} className="animate-spin text-stamp" aria-hidden="true" />
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        Setting things up
      </h1>
      <p className="mt-3 text-base text-ink-muted">This only takes a second.</p>
    </div>
  );
}