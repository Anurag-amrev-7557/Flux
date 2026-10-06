/**
 * Currency formatting utilities supporting standard and compact financial notation
 * (K = Thousands, M = Millions, B = Billions, T = Trillions) with optical typography.
 */

export function formatCompactCurrency(
    amount: number,
    currencySymbol: string = '$',
    compactThreshold: number = 1000,
    forceExplicitSign: boolean = false
): string {
    const abs = Math.abs(amount);
    const sign = amount < 0 ? '\u2212' : (forceExplicitSign && amount > 0 ? '+' : '');

    if (abs >= compactThreshold) {
        const formatted = new Intl.NumberFormat('en-US', {
            notation: 'compact',
            compactDisplay: 'short',
            maximumFractionDigits: 2,
        }).format(abs);
        return `${sign}${currencySymbol}${formatted}`;
    }

    return `${sign}${currencySymbol}${abs.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

export function formatFullCurrency(
    amount: number,
    currencySymbol: string = '$',
    forceExplicitSign: boolean = false
): string {
    const abs = Math.abs(amount);
    const sign = amount < 0 ? '\u2212' : (forceExplicitSign && amount > 0 ? '+' : '');
    return `${sign}${currencySymbol}${abs.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

