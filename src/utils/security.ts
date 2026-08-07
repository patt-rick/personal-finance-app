import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import * as LocalAuthentication from "expo-local-authentication";

const PIN_HASH_KEY = "pin_hash";
const PIN_SALT_KEY = "pin_salt";
const BIOMETRICS_ENABLED_KEY = "biometrics_enabled";
const PIN_ENABLED_KEY = "pin_enabled";
const SECURITY_Q1_KEY = "security_q1";
const SECURITY_A1_HASH_KEY = "security_a1_hash";
const SECURITY_A1_SALT_KEY = "security_a1_salt";
const SECURITY_Q2_KEY = "security_q2";
const SECURITY_A2_HASH_KEY = "security_a2_hash";
const SECURITY_A2_SALT_KEY = "security_a2_salt";

export const SECURITY_QUESTIONS = [
    "What is the name of your first pet?",
    "What city were you born in?",
    "What is your mother's maiden name?",
    "What was the name of your first school?",
    "What is your favorite food?",
    "What was the make of your first car?",
    "What is your childhood nickname?",
    "What street did you grow up on?",
];

async function hashPin(pin: string, salt: string): Promise<string> {
    const data = pin + salt;
    return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data);
}

function generateSalt(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export async function setupPin(pin: string): Promise<void> {
    const salt = generateSalt();
    const hash = await hashPin(pin, salt);
    await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
    await SecureStore.setItemAsync(PIN_SALT_KEY, salt);
    await SecureStore.setItemAsync(PIN_ENABLED_KEY, "true");
}

export async function verifyPin(pin: string): Promise<boolean> {
    const storedHash = await SecureStore.getItemAsync(PIN_HASH_KEY);
    const salt = await SecureStore.getItemAsync(PIN_SALT_KEY);
    if (!storedHash || !salt) return false;

    const hash = await hashPin(pin, salt);
    return hash === storedHash;
}

export async function isPinEnabled(): Promise<boolean> {
    const enabled = await SecureStore.getItemAsync(PIN_ENABLED_KEY);
    return enabled === "true";
}

export async function removePin(): Promise<void> {
    await SecureStore.deleteItemAsync(PIN_HASH_KEY);
    await SecureStore.deleteItemAsync(PIN_SALT_KEY);
    await SecureStore.deleteItemAsync(PIN_ENABLED_KEY);
    await SecureStore.deleteItemAsync(BIOMETRICS_ENABLED_KEY);
    await SecureStore.deleteItemAsync(SECURITY_Q1_KEY);
    await SecureStore.deleteItemAsync(SECURITY_A1_HASH_KEY);
    await SecureStore.deleteItemAsync(SECURITY_A1_SALT_KEY);
    await SecureStore.deleteItemAsync(SECURITY_Q2_KEY);
    await SecureStore.deleteItemAsync(SECURITY_A2_HASH_KEY);
    await SecureStore.deleteItemAsync(SECURITY_A2_SALT_KEY);
}

export async function saveSecurityQuestions(
    q1: string,
    a1: string,
    q2: string,
    a2: string,
): Promise<void> {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    const hash1 = await hashPin(a1.trim().toLowerCase(), salt1);
    const hash2 = await hashPin(a2.trim().toLowerCase(), salt2);

    await SecureStore.setItemAsync(SECURITY_Q1_KEY, q1);
    await SecureStore.setItemAsync(SECURITY_A1_HASH_KEY, hash1);
    await SecureStore.setItemAsync(SECURITY_A1_SALT_KEY, salt1);
    await SecureStore.setItemAsync(SECURITY_Q2_KEY, q2);
    await SecureStore.setItemAsync(SECURITY_A2_HASH_KEY, hash2);
    await SecureStore.setItemAsync(SECURITY_A2_SALT_KEY, salt2);
}

export async function getSecurityQuestions(): Promise<{ q1: string; q2: string } | null> {
    const q1 = await SecureStore.getItemAsync(SECURITY_Q1_KEY);
    const q2 = await SecureStore.getItemAsync(SECURITY_Q2_KEY);
    if (!q1 || !q2) return null;
    return { q1, q2 };
}

export async function verifySecurityAnswers(a1: string, a2: string): Promise<boolean> {
    const [hash1, salt1, hash2, salt2] = await Promise.all([
        SecureStore.getItemAsync(SECURITY_A1_HASH_KEY),
        SecureStore.getItemAsync(SECURITY_A1_SALT_KEY),
        SecureStore.getItemAsync(SECURITY_A2_HASH_KEY),
        SecureStore.getItemAsync(SECURITY_A2_SALT_KEY),
    ]);
    if (!hash1 || !salt1 || !hash2 || !salt2) return false;

    const [check1, check2] = await Promise.all([
        hashPin(a1.trim().toLowerCase(), salt1),
        hashPin(a2.trim().toLowerCase(), salt2),
    ]);
    return check1 === hash1 && check2 === hash2;
}

export async function isBiometricsAvailable(): Promise<boolean> {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
}

export async function getBiometricType(): Promise<string> {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return "Face ID";
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return "Fingerprint";
    }
    return "Biometrics";
}

export async function setBiometricsEnabled(enabled: boolean): Promise<void> {
    await SecureStore.setItemAsync(BIOMETRICS_ENABLED_KEY, enabled ? "true" : "false");
}

export async function isBiometricsEnabled(): Promise<boolean> {
    const enabled = await SecureStore.getItemAsync(BIOMETRICS_ENABLED_KEY);
    return enabled === "true";
}

export async function authenticateWithBiometrics(): Promise<boolean> {
    const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Expense Tracker",
        cancelLabel: "Use PIN",
        disableDeviceFallback: true,
    });
    return result.success;
}
