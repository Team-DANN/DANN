import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useOnboarding } from "../../context/OnboardingContext.jsx";

export default function OwnerNameStep() {
  const navigate = useNavigate();
  const { draft, updateDraft } = useOnboarding();
  const [ownerName, setOwnerName] = useState(draft.ownerName || "");

  const handleSubmit = (event) => {
    event.preventDefault();
    updateDraft({ ownerName: ownerName.trim() });
    navigate("/onboarding/business-name");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 -ml-1 flex items-center gap-1 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back
      </button>

      <h1 className="text-center text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        What's your name?
      </h1>
      <p className="mt-3 text-center text-base text-ink-muted">
        So we know who's running the show.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <input
          type="text"
          required
          autoFocus
          value={ownerName}
          onChange={(event) => setOwnerName(event.target.value)}
          placeholder="Your full name"
          className="w-full rounded-xl border border-border bg-paper-light px-4 py-3.5 text-base text-ink outline-none transition-shadow placeholder:text-ink-muted/60 focus:border-stamp focus:ring-2 focus:ring-stamp/20"
        />
        <button
          type="submit"
          className="w-full rounded-2xl bg-stamp px-5 py-3.5 text-base font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-stamp-dark hover:shadow-lg hover:shadow-stamp/25"
        >
          Continue
        </button>
      </form>
    </>
  );
}