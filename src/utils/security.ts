import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import * as LocalAuthentication from "expo-local-authentication";

const PIN_HASH_KEY = "pin_hash";
const PIN_SALT_KEY = "pin_salt";
const BIOMETRICS_ENABLED_KEY = "biometrics_enabled";
const PIN_ENABLED_KEY = "pin_enabled";

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
        promptMessage: "Unlock Finance Tracker",
        cancelLabel: "Use PIN",
        disableDeviceFallback: true,
    });
    return result.success;
}
