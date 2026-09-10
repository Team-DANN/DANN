export default function SocialButton({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-paper-light px-5 py-3.5 text-sm font-medium text-ink transition-all hover:-translate-y-0.5 hover:border-ink/20 hover:bg-paper hover:shadow-md"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
