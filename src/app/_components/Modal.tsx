export default function Modal({
  children,
  onClose,
  className = "",
  style,
}: {
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
      onClick={onClose}
    >
      <div
        className={`rounded-[var(--radius-card)] bg-white p-8 shadow-[var(--shadow-card)] ${className}`}
        style={style}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
