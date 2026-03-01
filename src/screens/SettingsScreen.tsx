import React, { useState, useCallback, useMemo } from "react";
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
} from "react-native";
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
    Info,
    Palette,
    Pencil,
    Check,
} from "lucide-react-native";
import { useTheme } from "../theme/theme";
import { useThemeContext } from "../theme/ThemeContext";
import { UserProfile } from "../types";
import { exportAllData, importAllData, loadUserProfile } from "../utils/storage";
import CategoryManagementScreen from "./CategoryManagementScreen";

interface SettingsScreenProps {
    userProfile: UserProfile | null;
    saveUserProfile: (profile: UserProfile) => void;
    onDataImported: () => Promise<void>;
}

export default function SettingsScreen({ userProfile, saveUserProfile, onDataImported }: SettingsScreenProps) {
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { themeMode, setThemeMode } = useThemeContext();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [name, setName] = useState(userProfile?.name || "");
    const [email, setEmail] = useState(userProfile?.email || "");
    const [isEditing, setIsEditing] = useState(false);
    const [showCategories, setShowCategories] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

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

    const handleExport = useCallback(async () => {
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

    if (showCategories) {
        return <CategoryManagementScreen onBack={() => setShowCategories(false)} />;
    }

    const themeOptions = [
        { mode: "light" as const, label: "Light", icon: Sun },
        { mode: "dark" as const, label: "Dark", icon: Moon },
        { mode: "system" as const, label: "System", icon: Monitor },
    ];

    return (
        <View style={styles.container}>
            <View style={[styles.headerDecoration, { height: 260 + insets.top }]} />

            <View style={[styles.header, { paddingTop: Math.max(insets.top, 40) }]}>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 40 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Profile Card */}
                    <View style={styles.profileCard}>
                        <View style={styles.profileTop}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{initials}</Text>
                            </View>
                            <View style={styles.profileInfo}>
                                {isEditing ? (
                                    <>
                                        <View style={styles.editInputRow}>
                                            <User size={16} color={theme.colors.textSecondary} />
                                            <TextInput
                                                style={styles.editInput}
                                                value={name}
                                                onChangeText={setName}
                                                placeholder="Full Name"
                                                placeholderTextColor={theme.colors.placeholder}
                                                autoFocus
                                            />
                                        </View>
                                        <View style={styles.editInputRow}>
                                            <Mail size={16} color={theme.colors.textSecondary} />
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
                                    </>
                                ) : (
                                    <>
                                        <Text style={styles.profileName}>{name || "New User"}</Text>
                                        {email ? (
                                            <Text style={styles.profileEmail}>{email}</Text>
                                        ) : (
                                            <Text style={[styles.profileEmail, { fontStyle: "italic" }]}>
                                                No email set
                                            </Text>
                                        )}
                                    </>
                                )}
                            </View>
                            {isEditing ? (
                                <View style={{ flexDirection: "row", gap: 8 }}>
                                    <TouchableOpacity
                                        style={styles.editActionBtn}
                                        onPress={handleCancelEdit}
                                    >
                                        <Text style={[styles.editActionText, { color: theme.colors.textSecondary }]}>
                                            Cancel
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.editActionBtn, { backgroundColor: theme.colors.primary }]}
                                        onPress={handleSave}
                                    >
                                        <Check size={16} color="white" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.editBtn}
                                    onPress={() => setIsEditing(true)}
                                >
                                    <Pencil size={16} color={theme.colors.primary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* General Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>General</Text>
                        <View style={styles.groupCard}>
                            <TouchableOpacity
                                style={styles.row}
                                onPress={() => setShowCategories(true)}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: theme.colors.expenseBg }]}>
                                    <Tags size={18} color={theme.colors.expense} />
                                </View>
                                <Text style={styles.rowText}>Categories</Text>
                                <ChevronRight size={18} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Appearance Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Appearance</Text>
                        <View style={styles.groupCard}>
                            <View style={[styles.row, { borderBottomWidth: 0, paddingBottom: 12 }]}>
                                <View style={[styles.iconCircle, { backgroundColor: theme.colors.incomeBg }]}>
                                    <Palette size={18} color={theme.colors.primary} />
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
                                                color={isActive ? "white" : theme.colors.textSecondary}
                                            />
                                            <Text
                                                style={[
                                                    styles.themeOptionLabel,
                                                    isActive && { color: "white" },
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
                                <View style={[styles.iconCircle, { backgroundColor: "rgba(16, 185, 129, 0.1)" }]}>
                                    <Upload size={18} color="#10B981" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.rowText}>Export Data</Text>
                                    <Text style={styles.rowSubText}>Save a backup of all your data</Text>
                                </View>
                                {isExporting ? (
                                    <ActivityIndicator size="small" color={theme.colors.primary} />
                                ) : (
                                    <ChevronRight size={18} color={theme.colors.textSecondary} />
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.row, { borderBottomWidth: 0 }]}
                                onPress={handleImport}
                                disabled={isImporting}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: "rgba(99, 102, 241, 0.1)" }]}>
                                    <Download size={18} color="#6366F1" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.rowText}>Import Data</Text>
                                    <Text style={styles.rowSubText}>Restore from a backup file</Text>
                                </View>
                                {isImporting ? (
                                    <ActivityIndicator size="small" color={theme.colors.primary} />
                                ) : (
                                    <ChevronRight size={18} color={theme.colors.textSecondary} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* About Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>About</Text>
                        <View style={styles.groupCard}>
                            <View style={styles.row}>
                                <View style={[styles.iconCircle, { backgroundColor: "rgba(14, 165, 233, 0.1)" }]}>
                                    <Info size={18} color="#0EA5E9" />
                                </View>
                                <Text style={styles.rowText}>Version</Text>
                                <Text style={styles.rowValueText}>1.0.0</Text>
                                <View style={styles.premiumBadge}>
                                    <Text style={styles.premiumBadgeText}>Premium</Text>
                                </View>
                            </View>
                            <View style={[styles.row, { borderBottomWidth: 0 }]}>
                                <View style={[styles.iconCircle, { backgroundColor: "rgba(16, 185, 129, 0.1)" }]}>
                                    <Shield size={18} color="#10B981" />
                                </View>
                                <Text style={styles.rowText}>Encryption</Text>
                                <Text style={styles.rowValueText}>AES-256</Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const createStyles = (theme: any) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background },
        headerDecoration: {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: theme.colors.incomeBg,
            borderBottomLeftRadius: 40,
            borderBottomRightRadius: 40,
            opacity: 0.6,
        },
        header: {
            paddingHorizontal: 20,
            paddingBottom: 16,
        },
        headerTitle: {
            fontSize: 26,
            fontWeight: "800",
            color: theme.colors.text,
            letterSpacing: -0.3,
        },

        // Profile Card
        profileCard: {
            marginHorizontal: 20,
            marginTop: 8,
            backgroundColor: theme.colors.card,
            borderRadius: 20,
            padding: 20,
            elevation: 2,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
        },
        profileTop: {
            flexDirection: "row",
            alignItems: "center",
        },
        avatar: {
            width: 56,
            height: 56,
            borderRadius: 18,
            backgroundColor: theme.colors.primary,
            alignItems: "center",
            justifyContent: "center",
        },
        avatarText: {
            fontSize: 20,
            fontWeight: "700",
            color: "white",
            letterSpacing: 0.5,
        },
        profileInfo: {
            flex: 1,
            marginLeft: 16,
        },
        profileName: {
            fontSize: 18,
            fontWeight: "700",
            color: theme.colors.text,
            letterSpacing: -0.2,
        },
        profileEmail: {
            fontSize: 13,
            color: theme.colors.textSecondary,
            marginTop: 2,
        },
        editBtn: {
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: theme.colors.incomeBg,
            alignItems: "center",
            justifyContent: "center",
        },
        editInputRow: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: theme.colors.background,
            borderRadius: 10,
            paddingHorizontal: 10,
            height: 38,
            marginBottom: 6,
            gap: 8,
        },
        editInput: {
            flex: 1,
            fontSize: 14,
            color: theme.colors.text,
            padding: 0,
        },
        editActionBtn: {
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: theme.colors.surface,
            alignItems: "center",
            justifyContent: "center",
        },
        editActionText: {
            fontSize: 11,
            fontWeight: "600",
        },

        // Sections
        section: {
            marginTop: 24,
            paddingHorizontal: 20,
        },
        sectionLabel: {
            fontSize: 12,
            color: theme.colors.textSecondary,
            textTransform: "uppercase",
            marginBottom: 10,
            marginLeft: 4,
            fontWeight: "700",
            letterSpacing: 0.8,
        },

        // Grouped Card
        groupCard: {
            backgroundColor: theme.colors.card,
            borderRadius: 16,
            overflow: "hidden",
            elevation: 1,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 3,
        },
        row: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.colors.borderLight,
        },
        iconCircle: {
            width: 36,
            height: 36,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
        },
        rowText: {
            flex: 1,
            fontSize: 15,
            fontWeight: "600",
            color: theme.colors.text,
            letterSpacing: -0.1,
        },
        rowSubText: {
            fontSize: 12,
            color: theme.colors.textSecondary,
            marginTop: 1,
        },
        rowValueText: {
            fontSize: 14,
            color: theme.colors.textSecondary,
            fontWeight: "500",
            marginRight: 6,
        },

        // Premium Badge
        premiumBadge: {
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
            backgroundColor: theme.colors.incomeBg,
        },
        premiumBadgeText: {
            fontSize: 10,
            fontWeight: "700",
            color: theme.colors.primary,
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
            backgroundColor: theme.colors.surface,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            borderWidth: 1.5,
            borderColor: "transparent",
        },
        themeOptionActive: {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.primary,
        },
        themeOptionLabel: {
            fontSize: 11,
            fontWeight: "700",
            color: theme.colors.textSecondary,
            letterSpacing: 0.3,
        },
    });
