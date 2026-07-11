import { cn } from "@/lib/utils";

const variants = {
  default:
    "bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-400 hover:to-rose-500 shadow-lg shadow-red-500/25",
  outline:
    "border border-slate-700/60 bg-slate-900/50 text-slate-200 hover:border-red-500/50 hover:bg-red-950/30",
  danger:
    "bg-gradient-to-r from-red-700 to-red-900 text-white hover:from-red-600 hover:to-red-800 shadow-lg shadow-red-900/30",
  success:
    "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/20",
  ghost: "text-slate-300 hover:bg-red-950/40 hover:text-white",
} as const;

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
} as const;

export function Button({
  className,
  variant = "default",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
