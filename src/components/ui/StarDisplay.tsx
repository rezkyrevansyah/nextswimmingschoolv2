import Icon from "@/components/ui/Icon";

export default function StarDisplay({ stars, size = "md" }: { stars: number; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, k) => (
        <Icon key={k} name="star" className={`${dim} ${k < stars ? "text-amber-400" : "text-line"}`} strokeWidth={1.5} fill={k < stars ? "currentColor" : "none"} />
      ))}
    </span>
  );
}
