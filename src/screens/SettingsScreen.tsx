import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Platform,
    KeyboardAvoidingView,
    ActivityIndicator,
    BackHandler,
    Animated,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    User,
    Mail,
    Moon,
    Sun,
    Monitor,
    Tags,
    ChevronRight,
    Upload,
    Download,
    Shield,
    Lock,
    Info,
    Palette,
    Pencil,
    Check,
    ArrowLeft,
    Delete,
    Repeat,
    Handshake,
    BarChart3,
    Settings as SettingsIcon,
    Database,
    Sparkles,
    Zap,
} from "lucide-react-native";
import { useTheme } from "../theme/theme";
import { useThemeContext } from "../theme/ThemeContext";
import { UserProfile, RecurringTransaction, Debt, Business, Transaction } from "../types";
import { exportAllData, importAllData, loadUserProfile } from "../utils/storage";
import { isPinEnabled, verifyPin } from "../utils/security";
import { resetAllTours } from "../utils/tourStorage";
import CategoryManagementScreen from "./CategoryManagementScreen";
import SecuritySettingsScreen from "./SecuritySettingsScreen";
import RecurringTransactionsScreen from "./RecurringTransactionsScreen";
import DebtTrackerScreen from "./DebtTrackerScreen";
import ReportsScreen from "./ReportsScreen";
import AutoLogSettingsScreen from "../features/autoLogging/screens/AutoLogSettingsScreen";
import TourOverlay from "../components/TourOverlay";

const APP_VERSION = require("../../app.json").expo.version;

interface SettingsScreenProps {
    userProfile: UserProfile | null;
    saveUserProfile: (profile: UserProfile) => void;
    onDataImported: () => Promise<void>;
    onPinChanged: () => void;
    recurringTransactions: RecurringTransaction[];
    saveRecurringTransactions: (items: RecurringTransaction[]) => void;
    businesses: Business[];
    transactions: Transaction[];
    debts: Debt[];
    saveDebts: (debts: Debt[]) => void;
}

export default function SettingsScreen({
    userProfile,
    saveUserProfile,
    onDataImported,
    onPinChanged,
    recurringTransactions,
    saveRecurringTransactions,
    businesses,
    transactions,
    debts,
    saveDebts,
}: SettingsScreenProps) {
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { themeMode, setThemeMode } = useThemeContext();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [name, setName] = useState(userProfile?.name || "");
    const [email, setEmail] = useState(userProfile?.email || "");
    const [isEditing, setIsEditing] = useState(false);
    const [showCategories, setShowCategories] = useState(false);
    const [showSecurity, setShowSecurity] = useState(false);
    const [showRecurring, setShowRecurring] = useState(false);
    const [showDebts, setShowDebts] = useState(false);
    const [showReports, setShowReports] = useState(false);
    const [showAutoLog, setShowAutoLog] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [showExportVerify, setShowExportVerify] = useState(false);

    useFocusEffect(
        useCallback(() => {
            return () => {
                setShowCategories(false);
                setShowSecurity(false);
                setShowRecurring(false);
                setShowDebts(false);
                setShowReports(false);
                setShowAutoLog(false);
                setShowExportVerify(false);
            };
        }, [])
    );

    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (showExportVerify) {
                    setShowExportVerify(false);
                    return true;
                }
                if (showCategories) {
                    setShowCategories(false);
                    return true;
                }
                if (showSecurity) {
                    setShowSecurity(false);
                    return true;
                }
                if (showRecurring) {
                    setShowRecurring(false);
                    return true;
                }
                if (showDebts) {
                    setShowDebts(false);
                    return true;
                }
                if (showReports) {
                    setShowReports(false);
                    return true;
                }
                if (showAutoLog) {
                    setShowAutoLog(false);
                    return true;
                }
                return false;
            };
            const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
            return () => subscription.remove();
        }, [showCategories, showSecurity, showExportVerify, showRecurring, showDebts, showReports, showAutoLog])
    );

    const initials = (name || "U")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const handleSave = useCallback(() => {
        if (!name.trim()) {
            Alert.alert("Error", "Name cannot be empty");
            return;
        }
        saveUserProfile({ name: name.trim(), email: email.trim() });
        setIsEditing(false);
    }, [name, email, saveUserProfile]);

    const handleCancelEdit = useCallback(() => {
        setName(userProfile?.name || "");
        setEmail(userProfile?.email || "");
        setIsEditing(false);
    }, [userProfile]);

    const doExport = useCallback(async () => {
        setIsExporting(true);
        try {
            const success = await exportAllData();
            if (!success) {
                Alert.alert("Error", "Sharing is not available on this device.");
            }
        } catch {
            Alert.alert("Error", "Failed to export data.");
        } finally {
            setIsExporting(false);
        }
    }, []);

    const handleExport = useCallback(async () => {
        const pinOn = await isPinEnabled();
        if (pinOn) {
            setShowExportVerify(true);
        } else {
            doExport();
        }
    }, [doExport]);

    const handleExportVerified = useCallback(() => {
        setShowExportVerify(false);
        doExport();
    }, [doExport]);

    const handleImport = useCallback(() => {
        Alert.alert(
            "Import Data",
            "This will replace all your current data with the imported backup. This action cannot be undone. Continue?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Import",
                    style: "destructive",
                    onPress: async () => {
                        setIsImporting(true);
                        try {
                            const success = await importAllData();
                            if (success) {
                                await onDataImported();
                                const imported = await loadUserProfile();
                                setName(imported?.name || "");
                                setEmail(imported?.email || "");
                                Alert.alert("Success", "Data imported successfully. Your app data has been restored.");
                            }
                        } catch {
                            Alert.alert("Error", "Failed to import data. Please make sure you selected a valid backup file.");
                        } finally {
                            setIsImporting(false);
                        }
                    },
                },
            ],
        );
    }, [onDataImported]);

    if (showExportVerify) {
        return (
            <ExportPinVerifyScreen
                theme={theme}
                onVerified={handleExportVerified}
                onBack={() => setShowExportVerify(false)}
            />
        );
    }

    if (showCategories) {
        return <CategoryManagementScreen onBack={() => setShowCategories(false)} />;
    }

    if (showSecurity) {
        return <SecuritySettingsScreen onBack={() => setShowSecurity(false)} onPinChanged={onPinChanged} />;
    }

    if (showRecurring) {
        return (
            <RecurringTransactionsScreen
                onBack={() => setShowRecurring(false)}
                recurringTransactions={recurringTransactions}
                businesses={businesses}
                onSave={saveRecurringTransactions}
            />
        );
    }

    if (showDebts) {
        return (
            <DebtTrackerScreen
                onBack={() => setShowDebts(false)}
                debts={debts}
                onSave={saveDebts}
            />
        );
    }

    if (showReports) {
        return (
            <ReportsScreen
                businesses={businesses}
                transactions={transactions}
                onBack={() => setShowReports(false)}
            />
        );
    }

    if (showAutoLog) {
        return (
            <AutoLogSettingsScreen
                businesses={businesses}
                onBack={() => setShowAutoLog(false)}
                onDataChanged={onDataImported}
            />
        );
    }

    const themeOptions = [
        { mode: "light" as const, label: "Light", icon: Sun },
        { mode: "dark" as const, label: "Dark", icon: Moon },
        { mode: "system" as const, label: "System", icon: Monitor },
    ];

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 40) }]}>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 100 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Profile Card */}
                    <View style={styles.profileCard}>
                        <View style={styles.profileTop}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{initials}</Text>
                            </View>
                            <View style={styles.profileInfo}>
                                <Text style={styles.profileName}>{name || "New User"}</Text>
                                {email ? (
                                    <Text style={styles.profileEmail}>{email}</Text>
                                ) : (
                                    <Text style={[styles.profileEmail, { fontStyle: "italic" }]}>
                                        No email set
                                    </Text>
                                )}
                            </View>
                            {!isEditing && (
                                <TouchableOpacity
                                    style={styles.editBtn}
                                    onPress={() => setIsEditing(true)}
                                >
                                    <Pencil size={16} color={theme.colors.onPrimaryContainer} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {isEditing && (
                            <View style={styles.editSection}>
                                <View style={styles.editFieldGroup}>
                                    <Text style={styles.editFieldLabel}>Name</Text>
                                    <View style={styles.editInputRow}>
                                        <User size={16} color={theme.colors.onSurfaceVariant} />
                                        <TextInput
                                            style={styles.editInput}
                                            value={name}
                                            onChangeText={setName}
                                            placeholder="Full Name"
                                            placeholderTextColor={theme.colors.placeholder}
                                            autoFocus
                                        />
                                    </View>
                                </View>
                                <View style={styles.editFieldGroup}>
                                    <Text style={styles.editFieldLabel}>Email</Text>
                                    <View style={styles.editInputRow}>
                                        <Mail size={16} color={theme.colors.onSurfaceVariant} />
                                        <TextInput
                                            style={styles.editInput}
                                            value={email}
                                            onChangeText={setEmail}
                                            placeholder="Email address"
                                            placeholderTextColor={theme.colors.placeholder}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                        />
                                    </View>
                                </View>
                                <View style={styles.editActions}>
                                    <TouchableOpacity
                                        style={styles.editCancelBtn}
                                        onPress={handleCancelEdit}
                                    >
                                        <Text style={styles.editCancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.editSaveBtn}
                                        onPress={handleSave}
                                    >
                                        <Check size={16} color={theme.colors.onPrimary} />
                                        <Text style={styles.editSaveText}>Save</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* General Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>General</Text>
                        <View style={styles.groupCard}>
                            <TouchableOpacity
                                style={styles.row}
                                onPress={() => setShowCategories(true)}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: theme.colors.goldContainer }]}>
                                    <Tags size={18} color={theme.colors.gold} />
                                </View>
                                <Text style={styles.rowText}>Categories</Text>
                                <ChevronRight size={18} color={theme.colors.onSurfaceVariant} />
                            </TouchableOpacity>
                            <View style={styles.rowDivider} />
                            <TouchableOpacity
                                style={[styles.row, { borderBottomWidth: 0 }]}
                                onPress={() => setShowSecurity(true)}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryContainer }]}>
                                    <Lock size={18} color={theme.colors.onPrimaryContainer} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.rowText}>Security</Text>
                                    <Text style={styles.rowSubText}>PIN lock & biometrics</Text>
                                </View>
                                <ChevronRight size={18} color={theme.colors.onSurfaceVariant} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Features Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Features</Text>
                        <View style={styles.groupCard}>
                            <TouchableOpacity
                                style={styles.row}
                                onPress={() => setShowReports(true)}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: theme.colors.secondaryContainer }]}>
                                    <BarChart3 size={18} color={theme.colors.onSecondaryContainer} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.rowText}>Reports</Text>
                                    <Text style={styles.rowSubText}>Financial insights & analytics</Text>
                                </View>
                                <ChevronRight size={18} color={theme.colors.onSurfaceVariant} />
                            </TouchableOpacity>
                            <View style={styles.rowDivider} />
                            <TouchableOpacity
                                style={styles.row}
                                onPress={() => setShowRecurring(true)}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: theme.colors.incomeContainer }]}>
                                    <Repeat size={18} color={theme.colors.onIncomeContainer} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.rowText}>Recurring Transactions</Text>
                                    <Text style={styles.rowSubText}>Manage automated entries</Text>
                                </View>
                                <ChevronRight size={18} color={theme.colors.onSurfaceVariant} />
                            </TouchableOpacity>
                            <View style={styles.rowDivider} />
                            <TouchableOpacity
                                style={styles.row}
                                onPress={() => setShowDebts(true)}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: theme.colors.tertiaryContainer }]}>
                                    <Handshake size={18} color={theme.colors.onTertiaryContainer} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.rowText}>Debts & Loans</Text>
                                    <Text style={styles.rowSubText}>Track money owed & owing</Text>
                                </View>
                                <ChevronRight size={18} color={theme.colors.onSurfaceVariant} />
                            </TouchableOpacity>
                            <View style={styles.rowDivider} />
                            <TouchableOpacity
                                style={[styles.row, { borderBottomWidth: 0 }]}
                                onPress={() => setShowAutoLog(true)}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryContainer }]}>
                                    <Zap size={18} color={theme.colors.onPrimaryContainer} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.rowText}>Automatic Logging</Text>
                                    <Text style={styles.rowSubText}>Capture from SMS & notifications</Text>
                                </View>
                                <ChevronRight size={18} color={theme.colors.onSurfaceVariant} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Appearance Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Appearance</Text>
                        <View style={styles.groupCard}>
                            <View style={[styles.row, { borderBottomWidth: 0, paddingBottom: 12 }]}>
                                <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryContainer }]}>
                                    <Palette size={18} color={theme.colors.onPrimaryContainer} />
                                </View>
                                <Text style={styles.rowText}>Theme</Text>
                            </View>
                            <View style={styles.themeRow}>
                                {themeOptions.map((option) => {
                                    const Icon = option.icon;
                                    const isActive = themeMode === option.mode;
                                    return (
                                        <TouchableOpacity
                                            key={option.mode}
                                            style={[
                                                styles.themeOption,
                                                isActive && styles.themeOptionActive,
                                            ]}
                                            onPress={() => setThemeMode(option.mode)}
                                        >
                                            <Icon
                                                size={18}
                                                color={isActive ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant}
                                            />
                                            <Text
                                                style={[
                                                    styles.themeOptionLabel,
                                                    isActive && styles.themeOptionLabelActive,
                                                ]}
                                            >
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    </View>

                    {/* Data Management Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Data</Text>
                        <View style={styles.groupCard}>
                            <TouchableOpacity
                                style={styles.row}
                                onPress={handleExport}
                                disabled={isExporting}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: theme.colors.incomeContainer }]}>
                                    <Upload size={18} color={theme.colors.onIncomeContainer} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.rowText}>Export Data</Text>
                                    <Text style={styles.rowSubText}>Save a backup of all your data</Text>
                                </View>
                                {isExporting ? (
                                    <ActivityIndicator size="small" color={theme.colors.primary} />
                                ) : (
                                    <ChevronRight size={18} color={theme.colors.onSurfaceVariant} />
                                )}
                            </TouchableOpacity>
                            <View style={styles.rowDivider} />
                            <TouchableOpacity
                                style={[styles.row, { borderBottomWidth: 0 }]}
                                onPress={handleImport}
                                disabled={isImporting}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryContainer }]}>
                                    <Download size={18} color={theme.colors.onPrimaryContainer} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.rowText}>Import Data</Text>
                                    <Text style={styles.rowSubText}>Restore from a backup file</Text>
                                </View>
                                {isImporting ? (
                                    <ActivityIndicator size="small" color={theme.colors.primary} />
                                ) : (
                                    <ChevronRight size={18} color={theme.colors.onSurfaceVariant} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* About Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>About</Text>
                        <View style={styles.groupCard}>
                            <View style={styles.row}>
                                <View style={[styles.iconCircle, { backgroundColor: theme.colors.secondaryContainer }]}>
                                    <Info size={18} color={theme.colors.onSecondaryContainer} />
                                </View>
                                <Text style={styles.rowText}>Version</Text>
                                <Text style={styles.rowValueText}>{APP_VERSION}</Text>
                                <View style={styles.premiumBadge}>
                                    <Text style={styles.premiumBadgeText}>Premium</Text>
                                </View>
                            </View>
                            <View style={styles.rowDivider} />
                            <View style={styles.row}>
                                <View style={[styles.iconCircle, { backgroundColor: theme.colors.incomeContainer }]}>
                                    <Shield size={18} color={theme.colors.onIncomeContainer} />
                                </View>
                                <Text style={styles.rowText}>Encryption</Text>
                                <Text style={styles.rowValueText}>AES-256</Text>
                            </View>
                            <View style={styles.rowDivider} />
                            <TouchableOpacity
                                style={[styles.row, { borderBottomWidth: 0 }]}
                                onPress={() => {
                                    resetAllTours();
                                    Alert.alert("Tours Reset", "The guided tours will show again on each page.");
                                }}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryContainer }]}>
                                    <Info size={18} color={theme.colors.onPrimaryContainer} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.rowText}>Replay Tours</Text>
                                    <Text style={styles.rowSubText}>Show feature guides again</Text>
                                </View>
                                <ChevronRight size={18} color={theme.colors.onSurfaceVariant} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <TourOverlay
                page="settings"
                steps={[
                    {
                        title: "Your Profile",
                        icon: <User size={24} color={theme.colors.primary} />,
                        description:
                            "Set your name and email at the top. Tap the pencil icon to edit your profile details.",
                    },
                    {
                        title: "Categories & Security",
                        icon: <SettingsIcon size={24} color={theme.colors.primary} />,
                        description:
                            "Customize transaction categories for income and expenses. Enable PIN lock or biometric authentication to protect your data.",
                    },
                    {
                        title: "Advanced Features",
                        icon: <Sparkles size={24} color={theme.colors.primary} />,
                        description:
                            "Access reports for financial insights, set up recurring transactions that auto-log, and track debts owed to or from others.",
                    },
                    {
                        title: "Backup & Restore",
                        icon: <Database size={24} color={theme.colors.primary} />,
                        description:
                            "Export all your data as a backup file, or import a previous backup to restore your information.",
                    },
                ]}
            />
        </View>
    );
}

function ExportPinVerifyScreen({
    theme,
    onVerified,
    onBack,
}: {
    theme: any;
    onVerified: () => void;
    onBack: () => void;
}) {
    const insets = useSafeAreaInsets();
    const [pin, setPin] = useState("");
    const [error, setError] = useState(false);
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const verifyStyles = useMemo(() => createVerifyStyles(theme), [theme]);

    const triggerShake = useCallback(() => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 16, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -16, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
        ]).start();
    }, [shakeAnim]);

    const handleDigit = useCallback(
        async (digit: string) => {
            if (error) return;
            const next = pin + digit;
            if (next.length > 4) return;
            setPin(next);
            if (next.length === 4) {
                const valid = await verifyPin(next);
                if (valid) {
                    onVerified();
                } else {
                    setError(true);
                    triggerShake();
                    setTimeout(() => {
                        setPin("");
                        setError(false);
                    }, 600);
                }
            }
        },
        [pin, error, onVerified, triggerShake]
    );

    const handleDelete = useCallback(() => {
        if (error) return;
        setPin((prev) => prev.slice(0, -1));
    }, [error]);

    useEffect(() => {
        const onBackPress = () => {
            onBack();
            return true;
        };
        const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
        return () => subscription.remove();
    }, [onBack]);

    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

    return (
        <View style={verifyStyles.container}>
            <View style={[verifyStyles.header, { paddingTop: Math.max(insets.top, 40) }]}>
                <TouchableOpacity
                    onPress={onBack}
                    style={verifyStyles.backBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <ArrowLeft size={20} color={theme.colors.onSurface} />
                </TouchableOpacity>
                <Text style={verifyStyles.headerTitle}>Verify PIN</Text>
            </View>

            <View style={verifyStyles.content}>
                <View style={verifyStyles.lockIconCircle}>
                    <Upload size={28} color={theme.colors.onPrimaryContainer} />
                </View>
                <Text style={verifyStyles.subtitle}>Enter your PIN to export data</Text>

                <Animated.View style={[verifyStyles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
                    {[0, 1, 2, 3].map((i) => (
                        <View
                            key={i}
                            style={[
                                verifyStyles.dot,
                                i < pin.length && verifyStyles.dotFilled,
                                error && verifyStyles.dotError,
                            ]}
                        />
                    ))}
                </Animated.View>

                {error && <Text style={verifyStyles.errorText}>Incorrect PIN</Text>}

                <View style={verifyStyles.keypad}>
                    {keys.map((k, i) => {
                        if (k === "") return <View key={i} style={verifyStyles.key} />;
                        if (k === "del") {
                            return (
                                <TouchableOpacity
                                    key={i}
                                    style={verifyStyles.key}
                                    onPress={handleDelete}
                                    disabled={pin.length === 0 || error}
                                >
                                    <Delete
                                        size={22}
                                        color={pin.length === 0 || error ? theme.colors.outlineVariant : theme.colors.onSurface}
                                    />
                                </TouchableOpacity>
                            );
                        }
                        return (
                            <TouchableOpacity
                                key={i}
                                style={verifyStyles.key}
                                onPress={() => handleDigit(k)}
                                disabled={error}
                            >
                                <Text style={verifyStyles.keyText}>{k}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </View>
    );
}

const createVerifyStyles = (theme: any) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background },
        header: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingBottom: 16,
            gap: 12,
        },
        backBtn: {
            width: 40,
            height: 40,
            borderRadius: theme.shape.medium,
            backgroundColor: theme.colors.surfaceContainerLow,
            alignItems: "center",
            justifyContent: "center",
            ...theme.elevation.level1,
            shadowColor: theme.colors.shadow,
        },
        headerTitle: {
            fontSize: 22,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurface,
        },
        content: {
            flex: 1,
            alignItems: "center",
            paddingTop: 60,
        },
        lockIconCircle: {
            width: 72,
            height: 72,
            borderRadius: theme.shape.extraLarge,
            backgroundColor: theme.colors.primaryContainer,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
        },
        subtitle: {
            fontSize: 15,
            color: theme.colors.onSurfaceVariant,
            fontFamily: theme.fonts.regular,
            marginBottom: 32,
        },
        dotsRow: {
            flexDirection: "row",
            gap: 18,
            marginBottom: 12,
        },
        dot: {
            width: 14,
            height: 14,
            borderRadius: 7,
            borderWidth: 2,
            borderColor: theme.colors.outline,
        },
        dotFilled: {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.primary,
        },
        dotError: {
            backgroundColor: theme.colors.error,
            borderColor: theme.colors.error,
        },
        errorText: {
            fontSize: 13,
            color: theme.colors.error,
            fontFamily: theme.fonts.semibold,
            marginTop: 4,
        },
        keypad: {
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            width: 240,
            marginTop: 36,
            gap: 12,
        },
        key: {
            width: 68,
            height: 68,
            borderRadius: 34,
            backgroundColor: theme.colors.surfaceContainerLow,
            alignItems: "center",
            justifyContent: "center",
            ...theme.elevation.level1,
            shadowColor: theme.colors.shadow,
        },
        keyText: {
            fontSize: 24,
            fontFamily: theme.fonts.regular,
            fontVariant: ["tabular-nums"],
            color: theme.colors.onSurface,
        },
    });

const createStyles = (theme: any) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background },
        header: {
            paddingHorizontal: 20,
            paddingBottom: 16,
        },
        headerTitle: {
            fontSize: 22,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurface,
        },

        // Profile Card
        profileCard: {
            marginHorizontal: 20,
            marginTop: 8,
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: 16,
            padding: 20,
        },
        profileTop: {
            flexDirection: "row",
            alignItems: "center",
        },
        avatar: {
            width: 56,
            height: 56,
            borderRadius: theme.shape.full,
            backgroundColor: theme.colors.surfaceContainerHigh,
            alignItems: "center",
            justifyContent: "center",
        },
        avatarText: {
            fontSize: 20,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurfaceVariant,
            letterSpacing: 0.5,
        },
        profileInfo: {
            flex: 1,
            marginLeft: 16,
        },
        profileName: {
            fontSize: 17,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurface,
        },
        profileEmail: {
            fontSize: 13,
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurfaceVariant,
            marginTop: 3,
        },
        editBtn: {
            width: 40,
            height: 40,
            borderRadius: theme.shape.full,
            backgroundColor: theme.colors.primaryContainer,
            alignItems: "center",
            justifyContent: "center",
        },
        editSection: {
            marginTop: 20,
            paddingTop: 20,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.colors.outlineVariant,
        },
        editFieldGroup: {
            marginBottom: 16,
        },
        editFieldLabel: {
            fontSize: 11,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurfaceVariant,
            marginBottom: 8,
            marginLeft: 2,
            textTransform: "uppercase",
            letterSpacing: 0.8,
        },
        editInputRow: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: theme.colors.surfaceContainerHigh,
            borderRadius: theme.shape.medium,
            paddingHorizontal: 14,
            height: 52,
            gap: 10,
        },
        editInput: {
            flex: 1,
            fontSize: 15,
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurface,
            padding: 0,
        },
        editActions: {
            flexDirection: "row",
            gap: 10,
            marginTop: 4,
        },
        editCancelBtn: {
            flex: 1,
            height: 52,
            borderRadius: theme.shape.full,
            backgroundColor: theme.colors.surfaceContainerHigh,
            alignItems: "center",
            justifyContent: "center",
        },
        editCancelText: {
            fontSize: 14,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurfaceVariant,
        },
        editSaveBtn: {
            flex: 1,
            height: 52,
            borderRadius: theme.shape.full,
            backgroundColor: theme.colors.primary,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
        },
        editSaveText: {
            fontSize: 14,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onPrimary,
        },

        // Sections
        section: {
            marginTop: 24,
            paddingHorizontal: 20,
        },
        sectionLabel: {
            fontSize: 11,
            color: theme.colors.onSurfaceVariant,
            textTransform: "uppercase",
            marginBottom: 10,
            marginLeft: 4,
            fontFamily: theme.fonts.semibold,
            letterSpacing: 0.8,
        },

        // Grouped Card
        groupCard: {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: 14,
            overflow: "hidden",
        },
        rowDivider: {
            height: StyleSheet.hairlineWidth,
            backgroundColor: theme.colors.borderLight,
            marginLeft: 64,
        },
        row: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 14,
            paddingVertical: 13,
        },
        iconCircle: {
            width: 34,
            height: 34,
            borderRadius: theme.shape.full,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
        },
        rowText: {
            flex: 1,
            fontSize: 14,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurface,
        },
        rowSubText: {
            fontSize: 11,
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurfaceVariant,
            marginTop: 1,
        },
        rowValueText: {
            fontSize: 13,
            color: theme.colors.onSurfaceVariant,
            fontFamily: theme.fonts.regular,
            fontVariant: ["tabular-nums"],
            marginRight: 6,
        },

        // Premium Badge
        premiumBadge: {
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: theme.shape.full,
            backgroundColor: theme.colors.primaryContainer,
        },
        premiumBadgeText: {
            fontSize: 10,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onPrimaryContainer,
            letterSpacing: 0.4,
        },

        // Theme
        themeRow: {
            flexDirection: "row",
            gap: 8,
            paddingHorizontal: 16,
            paddingBottom: 16,
        },
        themeOption: {
            flex: 1,
            height: 64,
            backgroundColor: "transparent",
            borderRadius: theme.shape.large,
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
        },
        themeOptionActive: {
            backgroundColor: theme.colors.secondaryContainer,
            borderColor: theme.colors.secondaryContainer,
        },
        themeOptionLabel: {
            fontSize: 11,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurfaceVariant,
            letterSpacing: 0.3,
        },
        themeOptionLabelActive: {
            color: theme.colors.onSecondaryContainer,
        },
    });
