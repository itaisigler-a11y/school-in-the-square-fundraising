import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-school-blue-500 text-white hover:bg-school-blue-600 shadow-school hover:shadow-school-lg active:bg-school-blue-700 transform hover:-translate-y-0.5",
        secondary: "bg-school-blue-50 text-school-blue-700 border border-school-blue-200 hover:bg-school-blue-100 hover:border-school-blue-300 shadow-school",
        accent: "bg-school-gold-500 text-school-blue-900 hover:bg-school-gold-600 shadow-school-gold hover:shadow-school-lg active:bg-school-gold-700 transform hover:-translate-y-0.5 font-bold",
        destructive: "bg-red-500 text-white hover:bg-red-600 shadow-school hover:shadow-school-lg active:bg-red-700",
        outline: "border border-school-blue-300 bg-white text-school-blue-700 hover:bg-school-blue-50 hover:border-school-blue-400 shadow-school",
        ghost: "text-school-blue-700 hover:bg-school-blue-50 hover:text-school-blue-800",
        link: "text-school-blue-600 underline-offset-4 hover:underline hover:text-school-blue-700",
        success: "bg-green-500 text-white hover:bg-green-600 shadow-school active:bg-green-700",
      },
      size: {
        default: "h-11 px-6 py-2 text-school-body",
        sm: "h-9 rounded-md px-4 text-school-small",
        lg: "h-13 rounded-lg px-8 text-school-subheading",
        icon: "h-11 w-11",
        xs: "h-8 rounded px-2 text-school-small",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
