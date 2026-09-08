import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UtensilsCrossed, Shirt, Package, SprayCan, Factory, MoreHorizontal } from "lucide-react";
import { useOnboarding } from "../../context/OnboardingContext.jsx";

const types = [
  { value: "food_packaged_goods", label: "Food & packaged goods", icon: UtensilsCrossed },
  { value: "textiles_garments", label: "Textiles & garments", icon: Shirt },
  { value: "packaging_printing", label: "Packaging & printing", icon: Package },
  { value: "personal_home_care", label: "Personal & home care", icon: SprayCan },
  { value: "general_manufacturing", label: "General small-batch manufacturing", icon: Factory },
  { value: "other", label: "Other", icon: MoreHorizontal },
];

export default function BusinessTypeStep() {
  const navigate = useNavigate();
  const { draft, updateDraft } = useOnboarding();
  const [selected, setSelected] = useState(draft.businessType || "");
  const [customType, setCustomType] = useState(draft.businessTypeCustom || "");
  const [submitting, setSubmitting] = useState(false);

  const isOther = selected === "other";

  function handleSelect(value) {
    setSelected(value);
    if (value !== "other") {
      setSubmitting(true);
      // "type" is what gets stored on business.type — for fixed categories
      // that's the slug itself; businessTypeCustom stays empty so nothing
      // ambiguous lands in the register payload.
      updateDraft({ businessType: value, businessTypeCustom: "" });
      navigate("/onboarding/country");
    }
  }

  function handleContinueOther(e) {
    e.preventDefault();
    if (!customType.trim()) return;
    updateDraft({ businessType: "other", businessTypeCustom: customType.trim() });
    navigate("/onboarding/country");
  }

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
            disabled={submitting}
            onClick={() => handleSelect(value)}
            className={`flex w-full items-center gap-4 rounded-xl border px-5 py-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60 ${
              selected === value
                ? "border-stamp bg-stamp/5"
                : "border-border bg-paper-light hover:border-stamp/40"
            }`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-stamp/10 text-stamp">
              <Icon size={20} aria-hidden="true" />
            </span>
            <span className="text-base font-medium text-ink">{label}</span>
          </button>
        ))}
      </div>

      {isOther && (
        <form onSubmit={handleContinueOther} className="mt-5 space-y-4">
          <input
            type="text"
            required
            autoFocus
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
            placeholder="Tell us what you make"
            className="w-full rounded-xl border border-border bg-paper-light px-4 py-3.5 text-base text-ink outline-none transition-shadow placeholder:text-ink-muted/60 focus:border-stamp focus:ring-2 focus:ring-stamp/20"
          />
          <button
            type="submit"
            className="w-full rounded-2xl bg-stamp px-5 py-3.5 text-base font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-stamp-dark hover:shadow-lg hover:shadow-stamp/25"
          >
            Continue
          </button>
        </form>
      )}
    </>
  );
}