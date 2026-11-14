import { forwardRef } from "react";

const variants = {
  primary:
    "bg-amber text-night hover:bg-[#ffc66f] shadow-[0_0_32px_-8px_rgba(255,181,71,0.6)]",
  soft: "bg-raised text-text hover:brightness-105",
  ghost: "bg-transparent text-muted hover:text-text hover:bg-white/5",
  outline: "bg-white/[0.03] text-text border border-white/10 hover:bg-white/[0.07]",
  sage: "bg-sage/15 text-sage border border-sage/25 hover:bg-sage/25",
  danger: "bg-transparent text-muted hover:text-red-300 hover:bg-red-500/10",
};

const sizes = {
  sm: "min-h-11 px-4 text-sm",
  md: "min-h-11 px-5 text-sm",
  lg: "min-h-12 px-6 text-base",
};

const Button = forwardRef(function Button(
  { children, variant = "primary", size = "md", className = "", type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-extrabold tracking-tight transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transform-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

export default Button;
