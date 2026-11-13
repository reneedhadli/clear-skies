export default function Glow({ color = "#FFB547", className = "", opacity = 0.35 }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-full blur-3xl ${className}`}
      style={{
        background: `radial-gradient(circle, ${color} 0%, transparent 68%)`,
        opacity,
      }}
    />
  );
}
