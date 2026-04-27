import { ProviderTemplate } from "./types";
import {
    mtnMomoDebit,
    mtnMomoCredit,
    mtnMomoTransfer,
    telecelDebit,
    telecelCredit,
    airtelTigoDebit,
    airtelTigoCredit,
} from "./mobileMoney";
import {
    ecobankDebit,
    ecobankCredit,
    gcbDebit,
    gcbCredit,
    fidelityDebit,
    fidelityCredit,
    absaDebit,
    absaCredit,
    stanbicDebit,
    stanbicCredit,
    zenithDebit,
    zenithCredit,
    calDebit,
    calCredit,
    accessDebit,
    accessCredit,
    genericBankDebit,
    genericBankCredit,
} from "./banks";
import {
    ecgBill,
    gwcBill,
    dstvSubscription,
    netflixSubscription,
    spotifySubscription,
    mobileAirtime,
} from "./billsAndSubs";
import {
    genericPaymentReceived,
    genericPaymentSent,
    genericRefund,
} from "./generic";

const ALL: ProviderTemplate[] = [
    ecgBill,
    gwcBill,
    dstvSubscription,
    netflixSubscription,
    spotifySubscription,
    mtnMomoDebit,
    mtnMomoCredit,
    mtnMomoTransfer,
    telecelDebit,
    telecelCredit,
    airtelTigoDebit,
    airtelTigoCredit,
    ecobankDebit,
    ecobankCredit,
    gcbDebit,
    gcbCredit,
    fidelityDebit,
    fidelityCredit,
    absaDebit,
    absaCredit,
    stanbicDebit,
    stanbicCredit,
    zenithDebit,
    zenithCredit,
    calDebit,
    calCredit,
    accessDebit,
    accessCredit,
    mobileAirtime,
    genericRefund,
    genericBankDebit,
    genericBankCredit,
    genericPaymentReceived,
    genericPaymentSent,
];

export function getProviderTemplates(): ProviderTemplate[] {
    return [...ALL].sort((a, b) => b.priority - a.priority);
}

export type { ProviderTemplate };
