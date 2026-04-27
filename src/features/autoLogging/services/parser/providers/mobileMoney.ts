import { ProviderTemplate } from "./types";
import { buildCredit, buildDebit, buildTransfer } from "./helpers";

const MTN_SENDER = /\b(mtn|momo|mtnmomo|mtnmobilemoney|mtngh)\b/i;
const TELECEL_SENDER = /\b(telecel|telecelgh|telecelcash|vodafone|vodafonegh|vodafonecash|vodacash)\b/i;
const AIRTELTIGO_SENDER = /\b(airtel|tigo|airteltigo|airteltigomoney)\b/i;

export const mtnMomoDebit: ProviderTemplate = {
    id: "mtn-momo-debit",
    priority: 100,
    senderMatch: MTN_SENDER,
    bodyMatch: [/\b(paid|payment|debit|sent|transferred|withdrawn)\b/i, /\b(ghs|gh¢|gh₵|ghc)\b/i],
    parse: (input) => buildDebit(input, { bodyMatch: [], baseConfidence: 0.9, merchantHint: "to" }),
};

export const mtnMomoCredit: ProviderTemplate = {
    id: "mtn-momo-credit",
    priority: 100,
    senderMatch: MTN_SENDER,
    bodyMatch: [/\b(received|credit|deposit|cash\s*in)\b/i, /\b(ghs|gh¢|gh₵|ghc)\b/i],
    parse: (input) => buildCredit(input, { bodyMatch: [], baseConfidence: 0.9, merchantHint: "from" }),
};

export const mtnMomoTransfer: ProviderTemplate = {
    id: "mtn-momo-transfer",
    priority: 95,
    senderMatch: MTN_SENDER,
    bodyMatch: [/\btransfer(red)?\b/i, /\bto\b/i],
    parse: (input) => buildTransfer(input, { bodyMatch: [], baseConfidence: 0.85, merchantHint: "to" }),
};

export const telecelDebit: ProviderTemplate = {
    id: "telecel-cash-debit",
    priority: 95,
    senderMatch: TELECEL_SENDER,
    bodyMatch: [/\b(paid|debit|sent|transferred|withdrawn|purchased)\b/i],
    parse: (input) => buildDebit(input, { bodyMatch: [], baseConfidence: 0.88, merchantHint: "to" }),
};

export const telecelCredit: ProviderTemplate = {
    id: "telecel-cash-credit",
    priority: 95,
    senderMatch: TELECEL_SENDER,
    bodyMatch: [/\b(received|credit|deposit)\b/i],
    parse: (input) => buildCredit(input, { bodyMatch: [], baseConfidence: 0.88, merchantHint: "from" }),
};

export const airtelTigoDebit: ProviderTemplate = {
    id: "airteltigo-money-debit",
    priority: 95,
    senderMatch: AIRTELTIGO_SENDER,
    bodyMatch: [/\b(paid|debit|sent|transferred|withdrawn|purchased)\b/i],
    parse: (input) => buildDebit(input, { bodyMatch: [], baseConfidence: 0.85, merchantHint: "to" }),
};

export const airtelTigoCredit: ProviderTemplate = {
    id: "airteltigo-money-credit",
    priority: 95,
    senderMatch: AIRTELTIGO_SENDER,
    bodyMatch: [/\b(received|credit|deposit)\b/i],
    parse: (input) => buildCredit(input, { bodyMatch: [], baseConfidence: 0.85, merchantHint: "from" }),
};
