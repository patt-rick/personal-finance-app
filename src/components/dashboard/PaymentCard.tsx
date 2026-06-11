import React, { useCallback, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle } from "react-native-svg";
import { getCurrencySymbol } from "../../utils/_helpers";
import { useTheme, getCardGradient } from "../../theme/theme";
import MoneyText from "../MoneyText";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_H_PADDING = 20;
const CARD_GAP = 12;
const PEEK_WIDTH = 24;
const CARD_WIDTH = SCREEN_WIDTH - CARD_H_PADDING * 2 - PEEK_WIDTH;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;
const CARD_RATIO = 1.586;

export interface CurrencyBalance {
    currency: string;
    income: number;
    expense: number;
    balance: number;
}

const CURRENCY_NAMES: Record<string, string> = {
    GHS: "Cedis",
    NGN: "Naira",
    USD: "Dollars",
    EUR: "Euros",
    GBP: "Pounds",
};

function Contactless() {
    return (
        <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path d="M6 8.5a8 8 0 0 1 0 7" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" fill="none" />
            <Path d="M9.5 6.5a12 12 0 0 1 0 11" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" fill="none" />
            <Path d="M13 4.5a16 16 0 0 1 0 15" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" fill="none" />
        </Svg>
    );
}

function Chip() {
    return (
        <LinearGradient
            colors={["#E8D9A8", "#C9B26E"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.chip}
        >
            <View style={styles.chipInner} />
        </LinearGradient>
    );
}

function Roundel() {
    return (
        <View style={styles.roundelRow}>
            <View style={[styles.roundel, { backgroundColor: "rgba(255,255,255,0.85)" }]} />
            <View style={[styles.roundel, styles.roundelOverlap, { backgroundColor: "rgba(255,210,80,0.85)" }]} />
        </View>
    );
}

function CardArt() {
    return (
        <Svg width={190} height={190} viewBox="0 0 190 190" style={styles.cardArt} pointerEvents="none">
            <Circle cx={140} cy={28} r={80} stroke="rgba(255,255,255,0.05)" strokeWidth={28} fill="none" />
        </Svg>
    );
}

interface PaymentCardProps {
    currencies: CurrencyBalance[];
    onPageChange?: (index: number) => void;
}

export default function PaymentCard({ currencies, onPageChange }: PaymentCardProps) {
    const theme = useTheme();
    const [activeIndex, setActiveIndex] = useState(0);

    const onScroll = useCallback(
        (e: NativeSyntheticEvent<NativeScrollEvent>) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / SNAP_INTERVAL);
            if (index !== activeIndex && index >= 0 && index < currencies.length) {
                setActiveIndex(index);
                onPageChange?.(index);
            }
        },
        [activeIndex, currencies.length, onPageChange],
    );

    const renderCard = (item: CurrencyBalance, index: number, cardWidth: number) => {
        const symbol = getCurrencySymbol(item.currency);
        const [from, to] = getCardGradient(item.currency, index);
        return (
            <View style={{ width: cardWidth }} key={item.currency}>
                <LinearGradient
                    colors={[from, to]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.card, { height: cardWidth / CARD_RATIO, shadowColor: from }]}
                >
                    <CardArt />
                    <View style={styles.topRow}>
                        <Text style={[styles.currencyName, { fontFamily: theme.fonts.semibold }]}>
                            {CURRENCY_NAMES[item.currency] ?? item.currency}
                        </Text>
                        <Contactless />
                    </View>
                    <Chip />
                    <MoneyText
                        amount={item.balance}
                        sign={item.balance < 0 ? "-" : ""}
                        symbol={symbol}
                        size={26}
                        color="#FFFFFF"
                        decimalColor="rgba(255,255,255,0.6)"
                        weight="semibold"
                        style={styles.balance}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                    />
                    <View style={styles.bottomRow}>
                        <Text
                            style={[styles.inOut, { fontFamily: theme.fonts.semibold }]}
                            numberOfLines={1}
                        >
                            IN {symbol} {item.income.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            {"  ·  "}
                            OUT {symbol} {item.expense.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </Text>
                        <Roundel />
                    </View>
                </LinearGradient>
            </View>
        );
    };

    if (currencies.length <= 1) {
        const item = currencies[0] ?? { currency: "USD", income: 0, expense: 0, balance: 0 };
        return <View style={styles.container}>{renderCard(item, 0, SCREEN_WIDTH - CARD_H_PADDING * 2)}</View>;
    }

    return (
        <View style={styles.containerMulti}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                decelerationRate="fast"
                snapToInterval={SNAP_INTERVAL}
                snapToAlignment="start"
                contentContainerStyle={{ paddingHorizontal: CARD_H_PADDING, gap: CARD_GAP }}
            >
                {currencies.map((c, i) => renderCard(c, i, CARD_WIDTH))}
            </ScrollView>
            <View style={styles.dotsRow}>
                {currencies.map((c, i) => (
                    <View
                        key={c.currency}
                        style={[
                            styles.dot,
                            {
                                backgroundColor:
                                    i === activeIndex ? theme.colors.primary : theme.colors.outlineVariant,
                                width: i === activeIndex ? 18 : 5,
                            },
                        ]}
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { paddingHorizontal: CARD_H_PADDING, marginTop: 8 },
    containerMulti: { marginTop: 8 },
    card: {
        borderRadius: 16,
        padding: 18,
        overflow: "hidden",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 18,
        elevation: 8,
    },
    cardArt: { position: "absolute", top: -20, right: -30 },
    topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    currencyName: {
        fontSize: 11,
        letterSpacing: 1.6,
        color: "rgba(255,255,255,0.85)",
        textTransform: "uppercase",
    },
    chip: { width: 34, height: 25, borderRadius: 5, marginTop: 10, padding: 4 },
    chipInner: { flex: 1, borderRadius: 2, borderWidth: 1, borderColor: "rgba(80,60,20,0.35)" },
    balance: {
        marginTop: 8,
        textShadowColor: "rgba(0,30,80,0.35)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 1,
    },
    bottomRow: {
        position: "absolute",
        left: 18,
        right: 18,
        bottom: 13,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
    },
    inOut: { fontSize: 9, letterSpacing: 0.5, color: "rgba(255,255,255,0.9)", flexShrink: 1 },
    roundelRow: { flexDirection: "row", alignItems: "center" },
    roundel: { width: 18, height: 18, borderRadius: 9 },
    roundelOverlap: { marginLeft: -8 },
    dotsRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 10, gap: 5 },
    dot: { height: 5, borderRadius: 3 },
});
