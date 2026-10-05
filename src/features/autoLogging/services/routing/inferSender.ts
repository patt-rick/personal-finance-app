// Sender IDs chosen so normalizeSender + applyAliases land on the same keys the
// provider templates' senderMatch expects.
const PROVIDERS: Array<{ sender: string; pattern: RegExp }> = [
    { sender: "MTN", pattern: /\b(?:mtn|momo)\b/i },
    { sender: "Telecel", pattern: /\b(?:telecel|vodafone\s*cash)\b/i },
    { sender: "AirtelTigo", pattern: /\b(?:airteltigo|at\s+money)\b/i },
    { sender: "GCB", pattern: /\bgcb\b/i },
    { sender: "Ecobank", pattern: /\becobank\b/i },
    { sender: "Fidelity", pattern: /\bfidelity\b/i },
    { sender: "Absa", pattern: /\babsa\b/i },
    { sender: "Stanbic", pattern: /\bstanbic\b/i },
    { sender: "Zenith", pattern: /\bzenith\b/i },
    { sender: "CalBank", pattern: /\bcal\s?bank\b/i },
    { sender: "Access Bank", pattern: /\baccess\s?bank\b/i },
];

// Used only when iOS didn't pass the SMS sender. The provider named earliest wins,
// since providers usually brand the start of their own messages.
export function inferSenderFromBody(body: string): string | null {
    let best: { sender: string; index: number } | null = null;
    for (const { sender, pattern } of PROVIDERS) {
        const match = pattern.exec(body);
        if (match && (best === null || match.index < best.index)) {
            best = { sender, index: match.index };
        }
    }
    return best?.sender ?? null;
}
