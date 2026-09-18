export default function CaseFileCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`w-full max-w-lg rounded-[var(--radius-card)] border-4 border-[var(--color-primary)] bg-[var(--color-surface)] px-8 py-8 shadow-[var(--shadow-card)] ${className}`}
    >
      <div className="rounded-lg border-2 border-dashed border-[var(--color-primary)]/40 px-6 py-6">
        {children}
      </div>
    </div>
  );
}
