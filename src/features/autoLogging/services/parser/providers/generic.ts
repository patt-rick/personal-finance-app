import { ProviderTemplate } from "./types";
import { buildCredit, buildDebit } from "./helpers";

export const genericPaymentReceived: ProviderTemplate = {
    id: "generic-payment-received",
    priority: 30,
    senderMatch: /.*/,
    bodyMatch: [/\b(payment\s+received|received\s+payment|you\s+have\s+received)\b/i],
    parse: (input) => buildCredit(input, { bodyMatch: [], baseConfidence: 0.65, merchantHint: "from" }),
};

export const genericPaymentSent: ProviderTemplate = {
    id: "generic-payment-sent",
    priority: 30,
    senderMatch: /.*/,
    bodyMatch: [/\b(you\s+have\s+sent|payment\s+sent|paid\s+to|sent\s+to)\b/i],
    parse: (input) => buildDebit(input, { bodyMatch: [], baseConfidence: 0.65, merchantHint: "to" }),
};

export const genericRefund: ProviderTemplate = {
    id: "generic-refund",
    priority: 60,
    senderMatch: /.*/,
    bodyMatch: [/\b(refund(?:ed)?|reversed|reversal)\b/i],
    parse: (input) =>
        buildCredit(input, {
            bodyMatch: [],
            semanticType: "refund",
            baseConfidence: 0.75,
            merchantHint: "from",
        }),
};
