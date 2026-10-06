import { parseNaturalLanguageExpense, ParsedExpense } from "./aiParser";

export interface AIParseResult extends ParsedExpense {
    source: 'groq' | 'offline';
}

export async function parseWithAI(
    input: string,
    categories: Record<string, { id: string; name: string }> | { id: string; name: string }[],
): Promise<AIParseResult> {
    const catArray = Array.isArray(categories)
        ? categories
        : Object.values(categories);

    // 1. Try Groq AI via secure Cloudflare Pages Function if online
    if (typeof window !== 'undefined' && navigator.onLine) {
        try {
            const res = await fetch('/api/ai/parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input,
                    categories: catArray.map(c => ({ id: c.id, name: c.name })),
                }),
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success && data.parsed) {
                    return {
                        ...data.parsed,
                        source: 'groq',
                    };
                }
            }
        } catch {
            // Function failed or not available - fall through to offline
        }
    }

    // 2. Fallback to offline rule-based parser
    const offline = parseNaturalLanguageExpense(input, catArray);
    return {
        ...offline,
        source: 'offline',
    };
}

// ─────────────────────────────────────────────────────────────
// FEATURE 2: EXECUTIVE FINANCIAL DIGEST (REPORTS PAGE)
// ─────────────────────────────────────────────────────────────

export interface DigestInput {
    timeframe: string;
    reportType: 'expense' | 'income';
    totalAmount: number;
    transactionCount: number;
    percentChange: number;
    netCashFlow: number;
    topCategories: { name: string; amount: number; percentage: number }[];
    currencySymbol: string;
}

export interface ExecutiveDigestResult {
    headline: string;
    summary: string;
    recommendation: string;
    source: 'groq' | 'offline';
}

export async function generateExecutiveDigest(
    input: DigestInput
): Promise<ExecutiveDigestResult> {
    // Groq AI is currently called client-side for digest generation.
    // For production, consider creating a /api/ai/digest endpoint similar to parse.ts
    // For now, using offline-only mode to ensure no API key exposure.

    // Deterministic high-quality offline briefing fallback
    const isSpending = input.reportType === 'expense';
    const topCat = input.topCategories[0]?.name || 'uncategorized spending';
    const topCatPct = input.topCategories[0]?.percentage?.toFixed(0) || '0';

    let headline = 'Spending pacing steady';
    let summary = '';
    let recommendation = '';

    if (input.transactionCount === 0) {
        headline = 'No transaction activity in this window';
        summary = 'Log your daily activity to unlock real-time financial telemetry.';
        recommendation = 'Tap + to log an expense or split a bill.';
    } else if (isSpending) {
        if (input.percentChange < -5) {
            headline = `Outflow down ${Math.abs(input.percentChange).toFixed(0)}% vs previous period`;
            summary = `Total expenses settled at ${input.currencySymbol}${input.totalAmount.toFixed(0)}, with ${topCat} accounting for ${topCatPct}% of outflows.`;
            recommendation = 'Surplus velocity remains positive. Keep current discretionary pacing.';
        } else if (input.percentChange > 5) {
            headline = `Outflow up ${input.percentChange.toFixed(0)}% vs previous period`;
            summary = `Expenses reached ${input.currencySymbol}${input.totalAmount.toFixed(0)}. Primary capital concentration remains in ${topCat} (${topCatPct}%).`;
            recommendation = `Monitor discretionary spend in ${topCat} over the coming week.`;
        } else {
            headline = 'Stable velocity across active categories';
            summary = `Net spend stands at ${input.currencySymbol}${input.totalAmount.toFixed(0)}. Top capital allocation: ${topCat} (${topCatPct}%).`;
            recommendation = 'Cash flow trajectory matches your target operational budget.';
        }
    } else {
        headline = `Total income of ${input.currencySymbol}${input.totalAmount.toFixed(0)} recorded`;
        summary = `Inflows tracked across ${input.transactionCount} transactions with net positive cash reserve.`;
        recommendation = 'Consider allocating upcoming surplus toward planned reserves or debt settlement.';
    }

    return {
        headline,
        summary,
        recommendation,
        source: 'offline',
    };
}

// ─────────────────────────────────────────────────────────────
// FEATURE 6: INTELLIGENT DEBT SETTLEMENT OPTIMIZATION
// ─────────────────────────────────────────────────────────────

export interface DebtParticipantSummary {
    personName: string;
    netBalance: number; // >0 means they owe user, <0 means user owes them
    lentTotal: number;
    oweTotal: number;
    activeCount: number;
}

export interface DebtOptimizationResult {
    summary: string;
    actionableStep: string;
    source: 'groq' | 'offline';
}

export async function generateDebtOptimization(
    participants: DebtParticipantSummary[],
    currencySymbol: string
): Promise<DebtOptimizationResult> {
    const activeParticipants = participants.filter(p => p.activeCount > 0 && Math.abs(p.netBalance) > 0.01);

    if (activeParticipants.length === 0) {
        return {
            summary: "All mutual balances are fully settled.",
            actionableStep: "No pending counterparties.",
            source: 'offline',
        };
    }

    // Groq AI is currently called client-side for debt optimization.
    // For production, consider creating a /api/ai/debt endpoint similar to parse.ts
    // For now, using offline-only mode to ensure no API key exposure.

    // Offline deterministic optimization
    const theyOwe = activeParticipants.filter(p => p.netBalance > 0).sort((a, b) => b.netBalance - a.netBalance);
    const youOwe = activeParticipants.filter(p => p.netBalance < 0).sort((a, b) => a.netBalance - b.netBalance);

    let summary = '';
    let actionableStep = '';

    if (theyOwe.length > 0 && youOwe.length > 0) {
        summary = `You have ${theyOwe.length} incoming receivables and ${youOwe.length} pending obligations.`;
        actionableStep = `Prioritize settling with ${youOwe[0].personName} (${currencySymbol}${Math.abs(youOwe[0].netBalance).toFixed(0)}) to clear your largest liability.`;
    } else if (theyOwe.length > 0) {
        summary = `You are net positive with ${theyOwe.length} active counterparties.`;
        actionableStep = `Request payment from ${theyOwe[0].personName} (${currencySymbol}${theyOwe[0].netBalance.toFixed(0)}) first.`;
    } else {
        summary = `You have ${youOwe.length} pending payables to settle.`;
        actionableStep = `Clear ${youOwe[0].personName} (${currencySymbol}${Math.abs(youOwe[0].netBalance).toFixed(0)}) to reduce total obligations.`;
    }

    return {
        summary,
        actionableStep,
        source: 'offline',
    };
}
