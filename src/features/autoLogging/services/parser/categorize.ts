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

export function categorize(
    merchant: string | null,
    rawText: string,
    type: "expense" | "income" | "transfer",
    categories: Category[],
    semanticType?: SemanticType,
): { category: string; confident: boolean } {
    const haystack = `${merchant ?? ""} ${rawText}`.toLowerCase();
    const rules = type === "income" ? INCOME_RULES : EXPENSE_RULES;
    const availableNames = new Set(categories.map((c) => c.name));

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
