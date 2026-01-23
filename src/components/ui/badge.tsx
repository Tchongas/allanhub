import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-slate-700 text-slate-300",
        success: "bg-emerald-900/50 text-emerald-400 border border-emerald-700",
        warning: "bg-amber-900/50 text-amber-400 border border-amber-700",
        error: "bg-red-900/50 text-red-400 border border-red-700",
        info: "bg-blue-900/50 text-blue-400 border border-blue-700",
        secondary: "bg-slate-600 text-slate-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
