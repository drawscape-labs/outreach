import { classNames } from "./class-names";
import { Badge } from "./ui/badge";

const pillTones = {
  amber: {
    color: "amber",
    dot: "fill-amber-500",
  },
  blue: {
    color: "blue",
    dot: "fill-blue-500",
  },
  emerald: {
    color: "emerald",
    dot: "fill-emerald-500",
  },
  gray: {
    color: "zinc",
    dot: "fill-zinc-400",
  },
  rose: {
    color: "rose",
    dot: "fill-rose-500",
  },
  teal: {
    color: "teal",
    dot: "fill-teal-500",
  }
};

export function StatusPill({ children, tone = "gray" }) {
  const palette = pillTones[tone] || pillTones.gray;

  return (
    <Badge color={palette.color} className="whitespace-nowrap">
      <svg viewBox="0 0 6 6" aria-hidden="true" className={classNames("size-1.5", palette.dot)}>
        <circle r={3} cx={3} cy={3} />
      </svg>
      {children}
    </Badge>
  );
}
