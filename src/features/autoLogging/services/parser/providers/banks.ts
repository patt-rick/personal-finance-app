import { ProviderTemplate } from "./types";
import { buildCredit, buildDebit } from "./helpers";

const ECOBANK = /\b(ecobank)\b/i;
const GCB = /\b(gcb|gcbbank|gcbmobile)\b/i;
const FIDELITY = /\b(fidelity|fidelitybank|fidelitygh)\b/i;
const ABSA = /\b(absa|absabank|absagh)\b/i;
const STANBIC = /\b(stanbic|stanbicbank)\b/i;
const ZENITH = /\b(zenith|zenithbank)\b/i;
const CAL = /\b(cal|calbank|calbankgh)\b/i;
const ACCESS = /\b(access|accessbank)\b/i;

const DEBIT_BODY: RegExp[] = [/\b(debit|debited|withdrawn|paid|purchase|spent|charged)\b/i];
const CREDIT_BODY: RegExp[] = [/\b(credit|credited|received|deposit|salary|payroll|inward|incoming)\b/i];

function debit(id: string, sender: RegExp, priority = 90): ProviderTemplate {
    return {
        id,
        priority,
        senderMatch: sender,
        bodyMatch: DEBIT_BODY,
        parse: (input) => buildDebit(input, { bodyMatch: [], baseConfidence: 0.85, merchantHint: "at" }),
    };
}

function credit(id: string, sender: RegExp, priority = 90): ProviderTemplate {
    return {
        id,
        priority,
        senderMatch: sender,
        bodyMatch: CREDIT_BODY,
        parse: (input) => buildCredit(input, { bodyMatch: [], baseConfidence: 0.85, merchantHint: "from" }),
    };
}

export const ecobankDebit = debit("ecobank-debit", ECOBANK);
export const ecobankCredit = credit("ecobank-credit", ECOBANK);
export const gcbDebit = debit("gcb-debit", GCB);
export const gcbCredit = credit("gcb-credit", GCB);
export const fidelityDebit = debit("fidelity-debit", FIDELITY);
export const fidelityCredit = credit("fidelity-credit", FIDELITY);
export const absaDebit = debit("absa-ghana-debit", ABSA);
export const absaCredit = credit("absa-ghana-credit", ABSA);
export const stanbicDebit = debit("stanbic-debit", STANBIC);
export const stanbicCredit = credit("stanbic-credit", STANBIC);
export const zenithDebit = debit("zenith-debit", ZENITH);
export const zenithCredit = credit("zenith-credit", ZENITH);
export const calDebit = debit("cal-debit", CAL);
export const calCredit = credit("cal-credit", CAL);
export const accessDebit = debit("access-debit", ACCESS);
export const accessCredit = credit("access-credit", ACCESS);

export const genericBankDebit: ProviderTemplate = {
    id: "generic-bank-debit",
    priority: 40,
    senderMatch: /\b(bank|alert)\b/i,
    bodyMatch: [/\b(debit\s+alert|account\s+(?:has\s+been\s+)?debited|withdrawn)\b/i],
    parse: (input) => buildDebit(input, { bodyMatch: [], baseConfidence: 0.7, merchantHint: "at" }),
};

export const genericBankCredit: ProviderTemplate = {
    id: "generic-bank-credit",
    priority: 40,
    senderMatch: /\b(bank|alert)\b/i,
    bodyMatch: [/\b(credit\s+alert|account\s+(?:has\s+been\s+)?credited|inward\s+credit)\b/i],
    parse: (input) => buildCredit(input, { bodyMatch: [], baseConfidence: 0.7, merchantHint: "from" }),
};
