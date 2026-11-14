export default function ProgressBar({
  value = 0,
  color = "var(--color-amber)",
  label = "Progress",
  className = "",
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`h-2.5 w-full overflow-hidden rounded-full bg-white/10 ${className}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  );
}
