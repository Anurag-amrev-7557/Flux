import React from "react";
import clsx from "clsx";

export type CardVariant = "elevated" | "filled" | "outlined";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: CardVariant;
    interactive?: boolean;
    children?: React.ReactNode;
    className?: string;
}

/**
 * Material 3 Card Component
 * Follows M3 specs with compact layout:
 * - Shape: 12dp corner radius (0.75rem)
 * - Padding: 12dp (0.75rem) - reduced from 16dp for more compact layout
 * - Variants: elevated (surface-container-low + drop shadow level 1),
 *             filled (surface-container-highest, no shadow),
 *             outlined (surface + outline-variant stroke)
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ variant = "elevated", interactive = false, className, children, ...props }, ref) => {
        const variantClass = {
            elevated: "m3-card-elevated",
            filled: "m3-card-filled",
            outlined: "m3-card-outlined",
        }[variant];

        return (
            <div
                ref={ref}
                className={clsx(
                    variantClass,
                    interactive && "m3-card-interactive",
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Card.displayName = "Card";

export const CardDivider = ({ inset = false, className }: { inset?: boolean; className?: string }) => (
    <hr className={clsx(inset ? "m3-card-divider-inset" : "m3-card-divider", className)} />
);
