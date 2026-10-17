import * as React from "react"

import { cn } from "@gotham/ui/lib/utils"

const corners = [
  "-top-px -left-px border-t border-l rounded-tl-xl",
  "-top-px -right-px border-t border-r rounded-tr-xl",
  "-bottom-px -left-px border-b border-l rounded-bl-xl",
  "-bottom-px -right-px border-b border-r rounded-br-xl",
]

/** A card with gold corner brackets, for the cards that matter most. */
function BracketCard({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bracket-card"
      className={cn("relative rounded-xl border border-border bg-card text-card-foreground", className)}
      {...props}
    >
      {corners.map((position) => (
        <span
          key={position}
          aria-hidden
          className={cn("pointer-events-none absolute size-4 border-primary/70", position)}
        />
      ))}
      {children}
    </div>
  )
}

export { BracketCard }
