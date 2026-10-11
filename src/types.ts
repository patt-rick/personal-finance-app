export interface Business {
    id: string;
    name: string;
    createdAt: string;
    memberCount?: number;
    hasNewActivity?: boolean;
    lastUpdated?: string;
    currency?: string; // e.g., 'USD', 'GHS', 'EUR'
    color?: string; // hex, e.g. "#7E57C2"
    icon?: string; // icon key, e.g. "shopping-cart"
}

export interface UserProfile {
    name: string;
    email?: string;
    profileImage?: string;
}

export interface Transaction {
    id: string;
    description: string;
    amount: number;
    date: string;
    type: "income" | "expense";
    businessId: string;
    category?: string;
    subCategory?: string;
    paymentMode?: string;
    remark?: string;
    source?: "manual" | "recurring" | "sms" | "notification" | "transfer";
    sourceApp?: string;
    rawText?: string;
    autoLogged?: boolean;
    confidence?: number;
    reviewStatus?: "pending" | "confirmed" | "rejected";
    transferId?: string;
    fee?: number; // fee/tax portion, same currency as amount; expense/transfer only
}

export interface Category {
    id: string;
    name: string;
    type: "income" | "expense";
    icon?: string;
    color?: string;
    isDefault?: boolean;
}

export type BudgetPeriod = "weekly" | "monthly" | "yearly";

export type BudgetScope =
    | { kind: "cashbook"; businessId: string }
    | { kind: "currency"; currency: string };

export type BudgetWarnAt = 70 | 80 | 90;

export interface BudgetLimits {
    periodStart: string;
    totalLimit: number;
    categoryLimits: { [categoryId: string]: number };
}

export interface Budget {
    id: string;
    scope: BudgetScope;
    period: BudgetPeriod;
    limits: BudgetLimits[];
    alerts: { enabled: boolean; warnAt: BudgetWarnAt };
    createdAt: string;
    updatedAt: string;
}

export interface LegacyBudget {
    id: string;
    businessId: string;
    period: BudgetPeriod;
    totalLimit: number;
    categoryBudgets?: { [categoryId: string]: { limit: number } };
    createdAt?: string;
    updatedAt?: string;
}

export type RecurrenceFrequency = "daily" | "weekly" | "biweekly" | "monthly" | "yearly";

export interface RecurringTransaction {
    id: string;
    description: string;
    amount: number;
    type: "income" | "expense";
    businessId: string;
    category?: string;
    remark?: string;
    frequency: RecurrenceFrequency;
    startDate: string;
    nextDueDate: string;
    endDate?: string;
    isActive: boolean;
    createdAt: string;
    lastGeneratedDate?: string;
}

export interface DebtPayment {
    id: string;
    amount: number;
    date: string;
    note?: string;
}

export interface Debt {
    id: string;
    personName: string;
    amount: number;
    type: "owed_to_me" | "i_owe";
    description?: string;
    dueDate?: string;
    currency: string;
    payments: DebtPayment[];
    createdAt: string;
    status: "active" | "settled";
}
