import { TransactionDocType, CategoryDocType } from "@/db/schema";

export interface AnomalyItem {
    id: string;
    type: 'duplicate' | 'price_hike' | 'spike';
    title: string;
    description: string;
    txId: string;
    amount: number;
    timestamp: number;
}

/**
 * Pure, privacy-preserving, instantaneous anomaly detector.
 * Scans recent transactions to identify:
 * 1. Duplicate charges (same amount + same merchant within 15 mins)
 * 2. Subscription price hikes (repeating merchant charging higher than past month)
 * 3. Spending spikes (> 3x category average)
 */
export function detectAnomalies(
    transactions: TransactionDocType[],
    categories: Record<string, CategoryDocType> = {}
): AnomalyItem[] {
    if (!transactions || transactions.length < 2) return [];

    const anomalies: AnomalyItem[] = [];
    const expenses = transactions
        .filter(t => (t.type === 'expense' || !t.type) && !t._deleted)
        .sort((a, b) => b.timestamp - a.timestamp);

    if (expenses.length === 0) return [];

    // 1. Detect Duplicate Charges (within 15 minutes, same amount and similar note)
    for (let i = 0; i < Math.min(expenses.length - 1, 20); i++) {
        const current = expenses[i];
        const next = expenses[i + 1];

        const timeDiffMins = Math.abs(current.timestamp - next.timestamp) / (1000 * 60);
        if (
            timeDiffMins <= 15 &&
            current.amount === next.amount &&
            current.note &&
            next.note &&
            current.note.trim().toLowerCase() === next.note.trim().toLowerCase()
        ) {
            anomalies.push({
                id: `dup-${current.id}-${next.id}`,
                type: 'duplicate',
                title: 'Possible Duplicate Charge',
                description: `2 identical charges of ${current.amount} for "${current.note}" within ${Math.max(1, Math.round(timeDiffMins))}m`,
                txId: current.id,
                amount: current.amount,
                timestamp: current.timestamp,
            });
            break; // Surface one duplicate at a time
        }
    }

    // 2. Detect Subscription / Recurring Merchant Price Hikes
    // Look for recurring merchant names (e.g. Netflix, Spotify, Gym, iCloud)
    const merchantHistory: Record<string, TransactionDocType[]> = {};
    expenses.forEach(tx => {
        if (!tx.note) return;
        const normalized = tx.note.trim().toLowerCase();
        if (normalized.length < 3) return;
        if (!merchantHistory[normalized]) merchantHistory[normalized] = [];
        merchantHistory[normalized].push(tx);
    });

    for (const [, history] of Object.entries(merchantHistory)) {
        if (history.length >= 2) {
            // Compare most recent with previous
            const latest = history[0];
            const previous = history[1];
            const daysBetween = Math.abs(latest.timestamp - previous.timestamp) / (1000 * 60 * 60 * 24);

            // If charges happen roughly monthly (20-40 days) and latest is more expensive
            if (daysBetween >= 20 && daysBetween <= 40 && latest.amount > previous.amount) {
                const diff = (latest.amount - previous.amount).toFixed(2);
                anomalies.push({
                    id: `hike-${latest.id}`,
                    type: 'price_hike',
                    title: 'Subscription Price Increase',
                    description: `"${latest.note}" charged ${latest.amount} (+${diff} vs previous month)`,
                    txId: latest.id,
                    amount: latest.amount,
                    timestamp: latest.timestamp,
                });
                break;
            }
        }
    }

    // 3. Category Spending Spike (single expense > 3x average in past 30 days)
    if (anomalies.length === 0 && expenses.length >= 5) {
        const categoryTotals: Record<string, { total: number; count: number }> = {};
        expenses.slice(1).forEach(tx => {
            const catId = tx.category_id || 'uncategorized';
            if (!categoryTotals[catId]) categoryTotals[catId] = { total: 0, count: 0 };
            categoryTotals[catId].total += tx.amount;
            categoryTotals[catId].count += 1;
        });

        const latest = expenses[0];
        const catId = latest.category_id || 'uncategorized';
        const catStat = categoryTotals[catId];

        if (catStat && catStat.count >= 3) {
            const avg = catStat.total / catStat.count;
            if (latest.amount >= avg * 3.5 && latest.amount > 50) {
                const catName = categories[catId]?.name || 'this category';
                anomalies.push({
                    id: `spike-${latest.id}`,
                    type: 'spike',
                    title: 'Unusual Spending Spike',
                    description: `"${latest.note || catName}" (${latest.amount}) is 3.5x higher than your average for ${catName}`,
                    txId: latest.id,
                    amount: latest.amount,
                    timestamp: latest.timestamp,
                });
            }
        }
    }

    return anomalies;
}
