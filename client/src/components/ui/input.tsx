import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border border-school-blue-200 bg-white px-4 py-3 text-school-body text-school-blue-900 ring-offset-background transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-school-blue-900 placeholder:text-school-blue-400 hover:border-school-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-school-blue-500 focus-visible:ring-offset-2 focus-visible:border-school-blue-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-school-blue-50 md:text-school-body",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
