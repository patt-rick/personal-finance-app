import React from "react";
import { View, StyleSheet } from "react-native";
import {
    ArrowLeftRight,
    Briefcase,
    Utensils,
    Bus,
    ShoppingBag,
    ReceiptText,
    HeartPulse,
    GraduationCap,
    Smartphone,
    Home,
    Gift,
    Repeat,
    Tag,
    Zap,
    TrendingUp,
} from "lucide-react-native";
import { useTheme } from "../theme/theme";

const RULES: { match: RegExp; Icon: React.ComponentType<any> }[] = [
    { match: /food|lunch|dinner|grocer|restaurant|chop/i, Icon: Utensils },
    { match: /transport|fuel|taxi|bus|uber|bolt|trotro/i, Icon: Bus },
    { match: /salary|wage|client|payment|income|sale/i, Icon: Briefcase },
    { match: /shop|cloth|market/i, Icon: ShoppingBag },
    { match: /bill|utilit|electric|water|rent/i, Icon: ReceiptText },
    { match: /health|medic|hospital|pharmac/i, Icon: HeartPulse },
    { match: /school|educat|tuition|book/i, Icon: GraduationCap },
    { match: /transfer/i, Icon: ArrowLeftRight },
    { match: /momo|airtime|data|phone/i, Icon: Smartphone },
    { match: /home|house/i, Icon: Home },
    { match: /gift|donat/i, Icon: Gift },
    { match: /recur|subscript/i, Icon: Repeat },
    { match: /invest|interest|dividend/i, Icon: TrendingUp },
];

// Warm tonal pairs [light bg, light fg, dark bg, dark fg]; stable by name hash.
const TONES: [string, string, string, string][] = [
    ["#F6E8D8", "#A8702E", "#352A1B", "#D9A05B"],
    ["#FCE4D6", "#B85C38", "#3A2620", "#E08A60"],
    ["#E4E0F2", "#6D5FA0", "#2B2838", "#B0A4E0"],
    ["#DCE9EC", "#0E6E7C", "#1C2E32", "#6FC4D4"],
    ["#F2DEE2", "#8C3A4B", "#342227", "#D98A9C"],
];

const hashName = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
};

interface CategoryIconProps {
    category?: string;
    type: "income" | "expense";
    autoLogged?: boolean;
    size?: number;
}

export default function CategoryIcon({ category, type, autoLogged, size = 34 }: CategoryIconProps) {
    const theme = useTheme();
    const name = category ?? "";
    const rule = RULES.find((r) => r.match.test(name));
    const Icon = rule?.Icon ?? (type === "income" ? Briefcase : Tag);

    let bg: string;
    let fg: string;
    if (type === "income") {
        bg = theme.colors.incomeContainer;
        fg = theme.colors.income;
    } else {
        const tone = TONES[hashName(name) % TONES.length];
        bg = theme.dark ? tone[2] : tone[0];
        fg = theme.dark ? tone[3] : tone[1];
    }

    return (
        <View
            style={[
                styles.circle,
                { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
            ]}
        >
            <Icon size={size * 0.47} color={fg} strokeWidth={2} />
            {autoLogged ? (
                <View style={[styles.badge, { backgroundColor: "#0066FF", borderColor: theme.colors.card }]}>
                    <Zap size={7} color="#FFFFFF" strokeWidth={3} fill="#FFFFFF" />
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    circle: { alignItems: "center", justifyContent: "center" },
    badge: {
        position: "absolute",
        right: -3,
        bottom: -3,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        alignItems: "center",
        justifyContent: "center",
    },
});
