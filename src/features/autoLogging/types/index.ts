export interface RawEvent {
    id: string;
    source: "sms" | "notification";
    packageName?: string;
    sender?: string;
    title?: string;
    body: string;
    timestamp: number;
    rawHash: string;
}

export interface ParsedDraft {
    amount: number;
    currencyCode: string | null;
    merchant: string | null;
    type: "expense" | "income" | "transfer";
    category: string;
    description: string;
    occurredAt: string;
    confidence: number;
    source: "sms" | "notification";
    sourceApp?: string;
    senderKey: string;
    senderDisplay: string;
    rawText: string;
}

export interface SenderMapping {
    senderKey: string;
    displayName: string;
    businessId: string | null;
    autoCreated: boolean;
    sampleSenders: string[];
    createdAt: string;
}

export interface ReviewItem {
    id: string;
    draft: ParsedDraft;
    businessId: string;
    createdAt: string;
}

export interface AutoLogSettings {
    enabled: boolean;
    captureSms: boolean;
    captureNotifications: boolean;
    defaultCurrency: string;
    allowedPackages: string[];
    allowedSenders: string[];
    reviewLowConfidenceOnly: boolean;
    askBeforeSaving: boolean;
    minConfidenceForAutoSave: number;
    defaultCurrencyMigrated: boolean;
}

export interface AutoLogStats {
    capturedSms: number;
    capturedNotifications: number;
    autoSaved: number;
    queuedForReview: number;
    dedupeHits: number;
    parseFailures: number;
    lastUpdated: string | null;
}
