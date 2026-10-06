import { evaluateMathExpression } from "./mathEval";

export interface ParsedExpense {
    amount: number | null;
    type: 'expense' | 'income';
    categoryName: string | null;
    categoryId?: string;
    note: string;
    personName?: string;
    isSplit?: boolean;
    confidence: number;
}

const CATEGORY_MAP: Record<string, string[]> = {
    "Food & Drink": [
        "coffee", "cafe", "latte", "espresso", "starbucks", "dunkin", "tea", "boba",
        "lunch", "dinner", "breakfast", "brunch", "restaurant", "burger", "pizza",
        "sushi", "chipotle", "mcdonald", "kfc", "subway", "taco", "bar", "beer", "wine",
        "cocktail", "pub", "nandos", "food", "snack", "bakery", "cake"
    ],
    "Groceries": [
        "groceries", "supermarket", "trader joe", "whole foods", "walmart", "costco",
        "kroger", "safeway", "target", "market", "milk", "eggs", "veggies", "produce",
        "provisions", "bazaar"
    ],
    "Transportation": [
        "uber", "lyft", "grab", "taxi", "cab", "metro", "subway", "bus", "train",
        "transit", "rail", "gas", "fuel", "petrol", "diesel", "parking", "toll",
        "flight", "airline", "plane", "delta", "united", "air", "fare", "scooter"
    ],
    "Shopping": [
        "amazon", "shopping", "clothes", "shoes", "zara", "h&m", "nike", "apple store",
        "electronics", "gadget", "mall", "order", "package", "ebay"
    ],
    "Entertainment": [
        "movie", "cinema", "theatre", "netflix", "spotify", "hulu", "disney", "youtube",
        "game", "steam", "playstation", "xbox", "concert", "ticket", "festival"
    ],
    "Housing & Utilities": [
        "rent", "mortgage", "electric", "electricity", "water", "gas bill", "utility",
        "wifi", "internet", "broadband", "maintenance", "repair", "plumber"
    ],
    "Health & Fitness": [
        "pharmacy", "medicine", "doctor", "hospital", "clinic", "dental", "gym",
        "fitness", "yoga", "crossfit", "supplements", "protein", "cvs", "walgreens"
    ],
    "Income": [
        "salary", "paycheck", "freelance", "client", "bonus", "dividend", "interest",
        "stipend", "refund", "cashback", "reimbursement", "deposit", "credit", "received"
    ]
};

/**
 * Extracts a numeric amount from text, supporting various currency symbols and patterns.
 */
function extractAmount(text: string): { amount: number | null; rawMatch: string | null } {
    // 1. Look for explicit currency symbols e.g. $45.50, ₹1,200, €30.00
    const symbolRegex = /(?:[\$€£₹¥]|USD|EUR|GBP|INR|AED)\s*([0-9]+(?:[,\.][0-9]{1,2})?)/i;
    const symbolMatch = text.match(symbolRegex);
    if (symbolMatch && symbolMatch[1]) {
        const clean = symbolMatch[1].replace(',', '');
        const num = parseFloat(clean);
        if (!isNaN(num) && num > 0) {
            return { amount: num, rawMatch: symbolMatch[0] };
        }
    }

    // 2. Look for "paid/spent XX", "XX dollars/bucks/rs/rupees"
    const wordsRegex = /(?:paid|spent|cost|for|of|received|got)\s+([0-9]+(?:\.[0-9]{1,2})?)/i;
    const wordsMatch = text.match(wordsRegex);
    if (wordsMatch && wordsMatch[1]) {
        const num = parseFloat(wordsMatch[1]);
        if (!isNaN(num) && num > 0) {
            return { amount: num, rawMatch: wordsMatch[0] };
        }
    }

    // 3. Fallback: match standalone decimal or integer numbers
    const fallbackRegex = /\b([0-9]+(?:\.[0-9]{1,2})?)\b/;
    const fallbackMatch = text.match(fallbackRegex);
    if (fallbackMatch && fallbackMatch[1]) {
        const num = parseFloat(fallbackMatch[1]);
        if (!isNaN(num) && num > 0) {
            return { amount: num, rawMatch: fallbackMatch[0] };
        }
    }

    return { amount: null, rawMatch: null };
}

/**
 * Fast, offline, privacy-first NLP parser for natural language expense input.
 * Handles inputs like:
 * - "Coffee with Marcus 5.50"
 * - "Paid 45 for Uber to JFK"
 * - "Split dinner $80 with Sarah"
 * - "Your A/C was debited for USD 28.50 at WHOLE FOODS"
 */
export function parseNaturalLanguageExpense(
    input: string,
    existingCategories: Array<{ id: string; name: string }> = []
): ParsedExpense {
    const raw = input.trim();
    if (!raw) {
        return {
            amount: null,
            type: 'expense',
            categoryName: null,
            note: "",
            confidence: 0
        };
    }

    const lower = raw.toLowerCase();

    // 1. Determine Type (Expense vs Income)
    const incomeKeywords = ["salary", "received", "refund", "cashback", "credited", "earned", "dividend", "paycheck", "deposit"];
    const isIncome = incomeKeywords.some(kw => lower.includes(kw));
    const type: 'expense' | 'income' = isIncome ? 'income' : 'expense';

    // 2. Extract Amount
    const { amount, rawMatch } = extractAmount(raw);

    // 3. Detect Debt / Split intent
    let personName: string | undefined;
    let isSplit = false;
    const splitMatch = raw.match(/(?:split\s+(?:bill\s+)?with|with)\s+([a-zA-Z]+)/i);
    if (splitMatch && splitMatch[1]) {
        const nameCandidate = splitMatch[1].trim();
        if (!["the", "my", "a", "an", "and"].includes(nameCandidate.toLowerCase())) {
            personName = nameCandidate.charAt(0).toUpperCase() + nameCandidate.slice(1);
            isSplit = true;
        }
    }

    // 4. Detect Category
    let detectedCatName: string | null = null;
    let detectedCatId: string | undefined;

    // Check existing categories first
    for (const cat of existingCategories) {
        const catLower = cat.name.toLowerCase();
        if (lower.includes(catLower)) {
            detectedCatName = cat.name;
            detectedCatId = cat.id;
            break;
        }
    }

    // If not matched, match against predefined keyword dictionary
    if (!detectedCatName) {
        for (const [catName, keywords] of Object.entries(CATEGORY_MAP)) {
            if (keywords.some(kw => lower.includes(kw))) {
                detectedCatName = catName;
                // Match with existing categories by name similarity
                const matchedExisting = existingCategories.find(c =>
                    c.name.toLowerCase().includes(catName.toLowerCase()) ||
                    catName.toLowerCase().includes(c.name.toLowerCase())
                );
                if (matchedExisting) {
                    detectedCatId = matchedExisting.id;
                    detectedCatName = matchedExisting.name;
                }
                break;
            }
        }
    }

    // 5. Construct Clean Note
    let note = raw;
    if (rawMatch) {
        note = note.replace(rawMatch, '').trim();
    }
    // Remove bank SMS noise e.g. "Your A/C ending 1234 debited for", "on 12-Oct"
    note = note.replace(/your a\/c(?: ending \d+)? (?:debited|credited)(?: for)?/i, '')
               .replace(/ref\s*no\s*[:\d]+/i, '')
               .replace(/on\s+\d{1,2}-[a-z]{3}(?:-\d{2,4})?/i, '')
               .replace(/\b(?:usd|eur|gbp|inr|aed)\b/i, '')
               .replace(/\s{2,}/g, ' ')
               .trim();

    // Capitalize first letter
    if (note.length > 0) {
        note = note.charAt(0).toUpperCase() + note.slice(1);
    } else {
        note = detectedCatName || (type === 'income' ? 'Income' : 'Expense');
    }

    const confidence = (amount ? 0.5 : 0) + (detectedCatName ? 0.3 : 0) + (note ? 0.2 : 0);

    return {
        amount,
        type,
        categoryName: detectedCatName,
        categoryId: detectedCatId,
        note,
        personName,
        isSplit,
        confidence
    };
}
