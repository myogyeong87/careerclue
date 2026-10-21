export default function CaseFileCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`w-full rounded-[var(--radius-card)] border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] ${className}`}
    >
      <div className="h-full rounded-[calc(var(--radius-card)-6px)] border-2 border-dashed border-[var(--color-primary)]/35 px-6 py-6">
        {children}
      </div>
    </div>
  );
}
