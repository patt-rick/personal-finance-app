export interface ConfidenceInputs {
    hasAmount: boolean;
    hasCurrency: boolean;
    hasMerchant: boolean;
    typeStrength: number;
    categoryConfident: boolean;
    hasFinancialKeyword: boolean;
}

export function scoreConfidence(inputs: ConfidenceInputs): number {
    let score = 0;
    if (inputs.hasAmount) score += 0.35;
    if (inputs.hasCurrency) score += 0.1;
    if (inputs.hasMerchant) score += 0.2;
    score += 0.2 * Math.min(1, Math.max(0, inputs.typeStrength));
    if (inputs.categoryConfident) score += 0.1;
    if (inputs.hasFinancialKeyword) score += 0.05;
    return Math.max(0, Math.min(1, score));
}
