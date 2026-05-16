import { Category } from "../../../../types";
import { SemanticType } from "../../types";

interface Rule {
    keywords: string[];
    category: string;
}

const EXPENSE_RULES: Rule[] = [
    { category: "Transportation", keywords: ["uber", "bolt", "yango", "taxi", "shell", "goil", "total", "allied", "petrol", "fuel", "stc", "vip transport"] },
    { category: "Food", keywords: ["kfc", "papaye", "chicken republic", "starbite", "pizza", "burger", "restaurant", "cafe", "chop bar"] },
    { category: "Utilities", keywords: ["ecg", "ghana water", "gwc", "dstv", "gotv", "netflix", "spotify", "mtn postpaid", "vodafone postpaid", "airtime", "data bundle", "electricity", "water bill"] },
    { category: "Healthcare", keywords: ["hospital", "pharmacy", "clinic", "medical", "drug", "korle bu", "37 military"] },
    { category: "Housing", keywords: ["rent", "landlord", "airbnb"] },
    { category: "Education", keywords: ["school fees", "university", "tuition", "college"] },
    { category: "Insurance", keywords: ["insurance", "sic", "enterprise insurance", "old mutual"] },
];

const INCOME_RULES: Rule[] = [
    { category: "Salary", keywords: ["salary", "payroll", "wages"] },
    { category: "Business", keywords: ["business income", "sales revenue"] },
    { category: "Freelance", keywords: ["freelance", "contract payment", "gig"] },
    { category: "Investment", keywords: ["dividend", "interest earned", "investment return"] },
];

const REFERENCE_RULES: Rule[] = [
    { category: "Salary", keywords: ["salary", "payroll", "wages", "wage", "stipend"] },
    { category: "Utilities", keywords: ["electricity", "ecg", "water", "dstv", "gotv", "netflix", "spotify", "airtime", "internet", "wifi", "broadband", "telecom", "utility", "utilities"] },
    { category: "Transportation", keywords: ["uber", "bolt", "yango", "taxi", "fuel", "petrol", "diesel", "transport", "ride"] },
    { category: "Housing", keywords: ["rent", "rental", "airbnb", "landlord", "lease", "hostel"] },
    { category: "Healthcare", keywords: ["hospital", "pharmacy", "clinic", "medical", "drug"] },
    { category: "Education", keywords: ["tuition", "school", "university", "college"] },
    { category: "Insurance", keywords: ["insurance", "premium"] },
    { category: "Food", keywords: ["restaurant", "groceries", "supermarket"] },
    { category: "Business", keywords: ["invoice", "business income", "sales revenue"] },
    { category: "Freelance", keywords: ["freelance", "consulting", "contract payment"] },
    { category: "Investment", keywords: ["dividend", "interest earned", "yield", "investment"] },
];

export function categorize(
    merchant: string | null,
    rawText: string,
    type: "expense" | "income" | "transfer",
    categories: Category[],
    semanticType?: SemanticType,
    reference?: string | null,
): { category: string; confident: boolean } {
    const haystack = `${merchant ?? ""} ${rawText}`.toLowerCase();
    const rules = type === "income" ? INCOME_RULES : EXPENSE_RULES;
    const availableNames = new Set(categories.map((c) => c.name));

    if (reference) {
        const refMatch = matchReference(reference, type, categories, availableNames);
        if (refMatch) return { category: refMatch, confident: true };
    }

    if ((semanticType === "bill" || semanticType === "subscription") && availableNames.has("Utilities")) {
        const matched = rules.find((r) => r.keywords.some((kw) => haystack.includes(kw)));
        if (!matched) return { category: "Utilities", confident: true };
    }

    for (const rule of rules) {
        if (rule.keywords.some((kw) => haystack.includes(kw))) {
            if (availableNames.has(rule.category)) {
                return { category: rule.category, confident: true };
            }
        }
    }

    const fallback = type === "income" ? "Other Income" : "Other Expense";
    if (availableNames.has(fallback)) return { category: fallback, confident: false };

    const anyMatching = categories.find((c) => c.type === (type === "income" ? "income" : "expense"));
    return { category: anyMatching?.name ?? fallback, confident: false };
}

function matchReference(
    reference: string,
    type: "expense" | "income" | "transfer",
    categories: Category[],
    availableNames: Set<string>,
): string | null {
    const expected: "income" | "expense" = type === "income" ? "income" : "expense";
    for (const rule of REFERENCE_RULES) {
        if (!availableNames.has(rule.category)) continue;
        const cat = categories.find((c) => c.name === rule.category);
        if (!cat || cat.type !== expected) continue;
        if (rule.keywords.some((kw) => matchesRefKeyword(reference, kw))) {
            return rule.category;
        }
    }
    return null;
}

function matchesRefKeyword(reference: string, keyword: string): boolean {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}`, "i").test(reference);
}
