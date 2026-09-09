import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Check, ArrowLeft } from "lucide-react";
import { useOnboarding } from "../../context/OnboardingContext.jsx";
import { countryOptions } from "../../lib/constants/countryOptions.js";

export default function CountryStep() {
  const navigate = useNavigate();
  const { draft, updateDraft } = useOnboarding();
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState(draft.country || "");
  const [currency, setCurrency] = useState(draft.currency || "");
  const [timezone, setTimezone] = useState(draft.timezone || "");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countryOptions;
    return countryOptions.filter((c) => c.name.toLowerCase().includes(q));
  }, [query]);

  function handlePick(c) {
    setCountry(c.name);
    setCurrency(c.currency);
    setTimezone(c.timezone);
    setQuery("");
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!country || !currency) return;
    updateDraft({ country, currency, timezone });
    navigate("/onboarding/complete");
  }

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
        Where are you based?
      </h1>
      <p className="mt-3 text-center text-base text-ink-muted">
        Sets your default currency and timezone you can change currency later in Settings.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {!country ? (
          <div>
            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted"
                aria-hidden="true"
              />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for your country"
                className="w-full rounded-xl border border-border bg-paper-light py-3.5 pl-11 pr-4 text-base text-ink outline-none transition-shadow placeholder:text-ink-muted/60 focus:border-stamp focus:ring-2 focus:ring-stamp/20"
              />
            </div>

            <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-border">
              {filtered.length === 0 && (
                <p className="px-4 py-3 text-sm text-ink-muted">No matches — try another spelling.</p>
              )}
              {filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handlePick(c)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-ink transition-colors hover:bg-paper"
                >
                  <span>{c.name}</span>
                  <span className="text-ink-muted">{c.currency}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-stamp bg-stamp/5 px-4 py-3.5">
            <span className="flex items-center gap-2 text-base font-medium text-ink">
              <Check size={18} className="text-stamp" aria-hidden="true" />
              {country}
            </span>
            <button
              type="button"
              onClick={() => {
                setCountry("");
                setCurrency("");
                setTimezone("");
              }}
              className="text-sm font-medium text-stamp hover:text-stamp-dark"
            >
              Change
            </button>
          </div>
        )}

        {country && (
          <div>
            <label className="mb-2 block text-sm font-medium text-ink">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-xl border border-border bg-paper-light px-4 py-3.5 text-base text-ink outline-none transition-shadow focus:border-stamp focus:ring-2 focus:ring-stamp/20"
            >
              {[...new Set(countryOptions.map((c) => c.currency))].map((sym) => (
                <option key={sym} value={sym}>
                  {sym}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-ink-muted">
              Set automatically from your country change it if it's not right.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={!country || !currency}
          className="w-full rounded-2xl bg-stamp px-5 py-3.5 text-base font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-stamp-dark hover:shadow-lg hover:shadow-stamp/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
        </button>
      </form>
    </>
  );
}