import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Croissant, Factory } from "lucide-react";
import { useOnboarding } from "../../context/OnboardingContext.jsx";

const types = [
  { value: "bakery", label: "Bakery", icon: Croissant },
  { value: "other", label: "Other manufacturer", icon: Factory },
];

export default function BusinessTypeStep() {
  const navigate = useNavigate();
  const { updateDraft } = useOnboarding();
  const [selecting, setSelecting] = useState(false);

  const handleSelect = (value) => {
    setSelecting(true);
    updateDraft({ businessType: value });
    navigate("/onboarding/complete");
  };

  return (
    <>
      <h1 className="text-center text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        What do you make?
      </h1>
      <p className="mt-3 text-center text-base text-ink-muted">
        Helps us tailor DANN to your setup.
      </p>

      <div className="mt-8 space-y-3">
        {types.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            disabled={selecting}
            onClick={() => handleSelect(value)}
            className="flex w-full items-center gap-4 rounded-xl border border-border bg-paper-light px-5 py-4 text-left transition-all hover:-translate-y-0.5 hover:border-stamp/40 hover:shadow-md disabled:opacity-60"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-stamp/10 text-stamp">
              <Icon size={20} aria-hidden="true" />
            </span>
            <span className="text-base font-medium text-ink">{label}</span>
          </button>
        ))}
      </div>
    </>
  );
}