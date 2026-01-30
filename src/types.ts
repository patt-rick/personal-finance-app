export interface Business {
    id: string;
    name: string;
    createdAt: string;
    memberCount?: number;
    hasNewActivity?: boolean;
    lastUpdated?: string;
    currency?: string; // e.g., 'USD', 'GHS', 'EUR'
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
}

export interface Category {
    id: string;
    name: string;
    type: "income" | "expense";
    icon?: string;
    color?: string;
    isDefault?: boolean;
}
