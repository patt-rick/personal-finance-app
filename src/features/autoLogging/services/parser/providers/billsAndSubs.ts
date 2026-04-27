import { ProviderTemplate } from "./types";
import { buildDebit } from "./helpers";

export const ecgBill: ProviderTemplate = {
    id: "ecg-bill",
    priority: 110,
    senderMatch: /\b(ecg|ecggh|ecghana|electricity)\b/i,
    bodyMatch: [/\b(bill|due|amount\s+payable|topup|recharge|prepaid)\b/i],
    parse: (input) =>
        buildDebit(input, {
            bodyMatch: [],
            semanticType: "bill",
            baseConfidence: 0.9,
        }),
};

export const gwcBill: ProviderTemplate = {
    id: "gwc-bill",
    priority: 110,
    senderMatch: /\b(ghanawater|gwc|ghwater)\b/i,
    bodyMatch: [/\b(bill|due|amount\s+payable)\b/i],
    parse: (input) =>
        buildDebit(input, {
            bodyMatch: [],
            semanticType: "bill",
            baseConfidence: 0.9,
        }),
};

export const dstvSubscription: ProviderTemplate = {
    id: "dstv-gotv-subscription",
    priority: 105,
    senderMatch: /\b(dstv|gotv|multichoice)\b/i,
    bodyMatch: [/\b(subscription|renewed|payment\s+received|paid|due)\b/i],
    parse: (input) =>
        buildDebit(input, {
            bodyMatch: [],
            semanticType: "subscription",
            baseConfidence: 0.88,
        }),
};

export const netflixSubscription: ProviderTemplate = {
    id: "netflix-subscription",
    priority: 105,
    senderMatch: /\b(netflix|com\.netflix\.mediaclient)\b/i,
    bodyMatch: [/\b(payment|charged|subscription|renewed)\b/i],
    parse: (input) =>
        buildDebit(input, {
            bodyMatch: [],
            semanticType: "subscription",
            baseConfidence: 0.85,
        }),
};

export const spotifySubscription: ProviderTemplate = {
    id: "spotify-subscription",
    priority: 105,
    senderMatch: /\b(spotify|com\.spotify\.music)\b/i,
    bodyMatch: [/\b(payment|charged|subscription|renewed)\b/i],
    parse: (input) =>
        buildDebit(input, {
            bodyMatch: [],
            semanticType: "subscription",
            baseConfidence: 0.85,
        }),
};

export const mobileAirtime: ProviderTemplate = {
    id: "mobile-airtime-debit",
    priority: 80,
    senderMatch: /\b(mtn|telecel|vodafone|airtel|tigo|airteltigo)\b/i,
    bodyMatch: [/\b(airtime|data\s*bundle|recharge|topup|top-up)\b/i],
    parse: (input) =>
        buildDebit(input, {
            bodyMatch: [],
            semanticType: "expense",
            baseConfidence: 0.78,
        }),
};
