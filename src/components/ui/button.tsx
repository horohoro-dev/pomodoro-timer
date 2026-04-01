import { forwardRef, type ButtonHTMLAttributes } from "react";
import { tv, type VariantProps, cn } from "@/lib/styles";

// ボタンコンポーネントのバリアント定義
const buttonVariants = tv({
  base: "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
      outline:
        "border border-border bg-background text-foreground hover:bg-muted",
      ghost: "text-foreground hover:bg-muted",
      destructive:
        "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    },
    size: {
      sm: "h-9 px-3",
      md: "h-10 px-4 py-2",
      lg: "h-12 px-8",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariantProps {}

// 汎用ボタンコンポーネント
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
