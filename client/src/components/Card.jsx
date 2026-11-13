export default function Card({ children, className = "", as: Tag = "div", ...props }) {
  return (
    <Tag
      className={`rounded-[28px] border border-white/[0.06] bg-surface/90 shadow-[0_18px_60px_-30px_rgba(17,20,13,0.3)] ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}
