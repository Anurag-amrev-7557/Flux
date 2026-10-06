import type { ExpenseDatabase } from "@/db/database";
import { ProfileDocType, CategoryDocType, TransactionDocType, DebtDocType, DebtPaymentDocType } from "@/db/schema";
import { mutate } from "@/sync/mutate";

export interface BackupData {
    version: number;
    appName: "Flux";
    exportedAt: string;
    data: {
        profiles: ProfileDocType[];
        categories: CategoryDocType[];
        transactions: TransactionDocType[];
        debts: DebtDocType[];
        debt_payments?: DebtPaymentDocType[];
    };
}

export async function exportDatabaseToJson(db: ExpenseDatabase): Promise<void> {
    const [profiles, categories, transactions, debts, payments] = await Promise.all([
        db.profiles.find().exec(),
        db.categories.find().exec(),
        db.transactions.find().exec(),
        db.debts.find().exec(),
        db.debt_payments.find().exec(),
    ]);

    const backup: BackupData = {
        version: 1,
        appName: "Flux",
        exportedAt: new Date().toISOString(),
        data: {
            profiles: profiles.map((p) => p.toJSON() as ProfileDocType),
            categories: categories.map((c) => c.toJSON() as CategoryDocType),
            transactions: transactions.map((t) => t.toJSON() as TransactionDocType),
            debts: debts.map((d) => d.toJSON() as DebtDocType),
            debt_payments: payments.map((p) => p.toJSON() as DebtPaymentDocType),
        },
    };

    const jsonString = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().split("T")[0];

    const a = document.createElement("a");
    a.href = url;
    a.download = `flux-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export async function importDatabaseFromJson(
    db: ExpenseDatabase,
    jsonString: string
): Promise<{ success: boolean; message: string; count: number }> {
    try {
        const parsed = JSON.parse(jsonString);
        if (!parsed.data || !Array.isArray(parsed.data.profiles)) {
            throw new Error("Invalid backup file format");
        }

        const data = parsed.data;
        let count = 0;

        // Restore profiles
        if (Array.isArray(data.profiles)) {
            for (const profile of data.profiles) {
                await mutate(db.profiles, profile.id, profile);
                count++;
            }
        }

        // Restore categories
        if (Array.isArray(data.categories)) {
            for (const cat of data.categories) {
                await mutate(db.categories, cat.id, cat);
                count++;
            }
        }

        // Restore transactions
        if (Array.isArray(data.transactions)) {
            for (const tx of data.transactions) {
                await mutate(db.transactions, tx.id, tx);
                count++;
            }
        }

        // Restore debts
        if (Array.isArray(data.debts)) {
            for (const debt of data.debts) {
                await mutate(db.debts, debt.id, debt);
                count++;
            }
        }

        // Restore debt payments
        if (Array.isArray(data.debt_payments)) {
            for (const payment of data.debt_payments) {
                await mutate(db.debt_payments, payment.id, payment);
                count++;
            }
        }

        return {
            success: true,
            message: `Successfully imported ${count} records!`,
            count,
        };
    } catch (err: unknown) {
        return {
            success: false,
            message: err instanceof Error ? err.message : "Failed to parse backup JSON",
            count: 0,
        };
    }
}

function escapeCsvCell(val: string | number | undefined | null): string {
    if (val === undefined || val === null) return '""';
    const str = String(val);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
}

export function exportTransactionsToCsv(
    transactions: TransactionDocType[],
    categoriesMap: Record<string, CategoryDocType>,
    filenamePrefix: string = "flux-transactions"
): void {
    const headers = ["Date", "Time", "Type", "Category", "Amount", "Note", "Transaction ID"];
    const rows = transactions.map(tx => {
        const d = new Date(tx.timestamp);
        const dateStr = d.toISOString().split("T")[0];
        const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const cat = categoriesMap[tx.category_id || ""];
        const catName = cat?.name || (tx.type === "income" ? "Income" : "Uncategorized");
        return [
            escapeCsvCell(dateStr),
            escapeCsvCell(timeStr),
            escapeCsvCell(tx.type),
            escapeCsvCell(catName),
            escapeCsvCell(tx.amount.toFixed(2)),
            escapeCsvCell(tx.note || ""),
            escapeCsvCell(tx.id),
        ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().split("T")[0];

    const a = document.createElement("a");
    a.href = url;
    a.download = `${filenamePrefix}-${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function exportDebtsToCsv(
    debts: DebtDocType[],
    filenamePrefix: string = "flux-debts"
): void {
    const headers = ["Person", "Direction", "Amount", "Purpose", "Status", "Due Date", "Created Date", "Debt ID"];
    const rows = debts.map(debt => {
        const createdDate = new Date(debt.created_at).toISOString().split("T")[0];
        const dueDate = debt.due_date ? new Date(debt.due_date).toISOString().split("T")[0] : "";
        const direction = debt.type === "lent" ? "They Owe You" : "You Owe Them";
        return [
            escapeCsvCell(debt.person_name),
            escapeCsvCell(direction),
            escapeCsvCell(debt.amount.toFixed(2)),
            escapeCsvCell(debt.purpose || ""),
            escapeCsvCell(debt.status),
            escapeCsvCell(dueDate),
            escapeCsvCell(createdDate),
            escapeCsvCell(debt.id),
        ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().split("T")[0];

    const a = document.createElement("a");
    a.href = url;
    a.download = `${filenamePrefix}-${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
