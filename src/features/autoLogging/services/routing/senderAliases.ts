export const SENDER_ALIASES: Record<string, string> = {
    mtngh: "mtn",
    mtnmomo: "mtn",
    mtnmobilemoney: "mtn",
    momo: "mtn",
    "com.mtn.momo": "mtn",
    "com.mtn.selfcare": "mtn",

    vodafonegh: "vodafone",
    vodafonecash: "vodafone",
    vodacash: "vodafone",
    "com.vodafone.selfcare": "vodafone",

    telecelgh: "telecel",
    "com.telecel.gh": "telecel",

    airtel: "airteltigo",
    tigo: "airteltigo",
    airteltigomoney: "airteltigo",
    "com.airtel.selfcare": "airteltigo",
    "com.tigo.selfcare": "airteltigo",

    gcbbank: "gcb",
    gcbmobile: "gcb",
    "com.gcb.mobile": "gcb",

    ecobank: "ecobank",
    "com.ecobank.mobile": "ecobank",

    absa: "absa",
    "com.absa.mobile": "absa",
};

export function applyAliases(senderKey: string): string {
    return SENDER_ALIASES[senderKey] ?? senderKey;
}
