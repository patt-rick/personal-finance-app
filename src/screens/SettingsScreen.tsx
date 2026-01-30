import React, { useState, useMemo } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    User,
    Save,
    Moon,
    Sun,
    Monitor,
    Bell,
    Menu,
    Tags,
    ChevronRight,
} from "lucide-react-native";
import { useTheme } from "../theme/theme";
import { useThemeContext } from "../theme/ThemeContext";
import { UserProfile } from "../types";
import { sendTestNotification } from "../utils/notifications";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import CategoryManagementScreen from "./CategoryManagementScreen";

interface SettingsScreenProps {
    userProfile: UserProfile | null;
    saveUserProfile: (profile: UserProfile) => void;
}

export default function SettingsScreen({ userProfile, saveUserProfile }: SettingsScreenProps) {
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const navigation = useNavigation();
    const { themeMode, setThemeMode } = useThemeContext();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [name, setName] = useState(userProfile?.name || "");
    const [email, setEmail] = useState(userProfile?.email || "");
    const [showCategories, setShowCategories] = useState(false);

    const handleSave = () => {
        if (!name.trim()) {
            Alert.alert("Error", "Name cannot be empty");
            return;
        }
        saveUserProfile({ name, email });
        Alert.alert("Success", "Profile updated successfully");
    };

    if (showCategories) {
        return <CategoryManagementScreen onBack={() => setShowCategories(false)} />;
    }

    const themeOptions = [
        { mode: "light", label: "Light", icon: Sun },
        { mode: "dark", label: "Dark", icon: Moon },
        { mode: "system", label: "System", icon: Monitor },
    ] as const;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
        >
            <ScrollView
                style={styles.container}
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 40 }}
            >
                <View
                    style={[
                        styles.header,
                        {
                            paddingTop: Math.max(insets.top, 40),
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                        },
                    ]}
                >
                    <Text style={styles.headerTitle}>Settings</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>General</Text>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => setShowCategories(true)}
                    >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                            <Tags size={20} color={theme.colors.text} />
                            <Text style={styles.menuItemText}>Categories</Text>
                        </View>
                        <ChevronRight size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Profile Information</Text>
                    <View style={styles.card}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <View style={styles.inputWrapper}>
                                <User size={20} color={theme.colors.textSecondary} />
                                <TextInput
                                    style={[styles.input]}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Enter your name"
                                    placeholderTextColor={theme.colors.placeholder}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email Address</Text>
                            <View style={styles.inputWrapper}>
                                <Text style={{ fontSize: 16, color: theme.colors.textSecondary }}>
                                    @
                                </Text>
                                <TextInput
                                    style={styles.input}
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="Enter your email"
                                    keyboardType="email-address"
                                    placeholderTextColor={theme.colors.placeholder}
                                />
                            </View>
                        </View>
                        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                            <Save size={20} color="white" />
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Theme Customization</Text>
                    <View style={styles.themeRow}>
                        {themeOptions.map((option) => {
                            const Icon = option.icon;
                            const isActive = themeMode === option.mode;
                            return (
                                <TouchableOpacity
                                    key={option.mode}
                                    style={[
                                        styles.themeOption,
                                        isActive && {
                                            backgroundColor: theme.colors.primary,
                                            borderColor: theme.colors.primary,
                                        },
                                    ]}
                                    onPress={() => setThemeMode(option.mode)}
                                >
                                    <Icon
                                        size={20}
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

                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>App Info</Text>
                    <View style={styles.menuItem}>
                        <Text style={styles.menuItemText}>Version</Text>
                        <Text style={styles.menuItemSubText}>1.0.0 (Premium)</Text>
                    </View>
                    <View style={styles.menuItem}>
                        <Text style={styles.menuItemText}>Secure Encryption</Text>
                        <Text style={styles.menuItemSubText}>AES-256 Enabled</Text>
                    </View>
                </View>

                {/* <View style={[styles.section, { marginBottom: 20 }]}>
                    <Text style={styles.sectionLabel}>Testing & Debug</Text>
                    <TouchableOpacity
                        style={[styles.menuItem, { backgroundColor: theme.colors.card }]}
                        onPress={sendTestNotification}
                    >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                            <Bell size={20} color={theme.colors.primary} />
                            <Text style={styles.menuItemText}>Send Test Notification</Text>
                        </View>
                        <Text style={[styles.menuItemSubText, { color: theme.colors.primary }]}>
                            Trigger Now
                        </Text>
                    </TouchableOpacity>
                </View> */}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const createStyles = (theme: any) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background },
        header: { paddingHorizontal: 20, paddingBottom: 20 },
        headerTitle: { fontSize: 24, fontWeight: "bold", color: theme.colors.text },
        section: { paddingHorizontal: 20, marginTop: 24 },
        sectionLabel: {
            fontSize: 13,
            color: theme.colors.textSecondary,
            textTransform: "uppercase",
            marginBottom: 12,
            marginLeft: 4,
            fontWeight: "600",
            letterSpacing: 0.5,
        },
        card: {
            backgroundColor: theme.colors.card,
            borderRadius: 16,
            padding: 16,
            elevation: 1,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
        },
        inputGroup: { marginBottom: 16 },
        label: { fontSize: 14, fontWeight: "500", color: theme.colors.text, marginBottom: 8 },
        inputWrapper: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.border,
            borderRadius: 12,
            paddingHorizontal: 12,
            height: 50,
        },
        input: {
            flex: 1,
            marginLeft: 10,
            fontSize: 16,
            color: theme.colors.text,
        },
        saveButton: {
            backgroundColor: theme.colors.primary,
            marginTop: 30,
            height: 56,
            borderRadius: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            elevation: 4,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
        },
        saveButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },
        menuItem: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: theme.colors.card,
            padding: 16,
            borderRadius: 16,
            marginBottom: 8,
        },
        menuItemText: { fontSize: 16, color: theme.colors.text, fontWeight: "500" },
        menuItemSubText: { fontSize: 14, color: theme.colors.textSecondary },

        // Theme Toggle Row
        themeRow: { flexDirection: "row", gap: 12 },
        themeOption: {
            flex: 1,
            height: 80,
            backgroundColor: theme.colors.card,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            borderWidth: 1,
            borderColor: theme.colors.borderLight,
        },
        themeOptionLabel: { fontSize: 12, fontWeight: "600", color: theme.colors.textSecondary },
    });
