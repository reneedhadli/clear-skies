const tones = {
  default: "bg-raised text-muted",
  amber: "bg-amber/15 text-amber",
  sage: "bg-sage/15 text-sage",
  storm: "bg-weather-storm/20 text-storm-ink",
  blue: "bg-weather-blizzard/10 text-weather-blizzard",
};

export default function Chip({
  children,
  tone = "default",
  as: Tag = "span",
  className = "",
  ...props
}) {
  return (
    <Tag
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${tones[tone]} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}
