import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    ScrollView,
    StyleProp,
    ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { useTheme } from "../theme/theme";
import { FLOATING_TAB_HEIGHT } from "./FloatingTabBar";

type AppModalVariant = "bottomSheet" | "center";

interface AppModalProps {
    visible: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
    variant?: AppModalVariant;
    dismissOnBackdrop?: boolean;
    showCloseButton?: boolean;
    showHandle?: boolean;
    avoidKeyboard?: boolean;
    scrollable?: boolean;
    headerRight?: React.ReactNode;
    maxHeight?: number | `${number}%`;
    contentStyle?: StyleProp<ViewStyle>;
    overlayStyle?: StyleProp<ViewStyle>;
    testID?: string;
}

export default function AppModal({
    visible,
    onClose,
    children,
    title,
    variant = "bottomSheet",
    dismissOnBackdrop = true,
    showCloseButton = true,
    showHandle,
    avoidKeyboard = true,
    scrollable = false,
    headerRight,
    maxHeight = "90%",
    contentStyle,
    overlayStyle,
    testID,
}: AppModalProps) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const s = React.useMemo(() => createStyles(theme), [theme]);

    const isBottomSheet = variant === "bottomSheet";
    const showHandleBar = showHandle ?? isBottomSheet;
    const hasHeader = !!title || showCloseButton || !!headerRight;

    const [keyboardVisible, setKeyboardVisible] = React.useState(false);
    React.useEffect(() => {
        const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
        const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
        const showSub = Keyboard.addListener(showEvt, () => setKeyboardVisible(true));
        const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardVisible(false));
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    const sheetBottomPadding = !isBottomSheet ? 0 : Math.max(insets.bottom, 12);

    const handleBackdropPress = () => {
        Keyboard.dismiss();
        if (dismissOnBackdrop) onClose();
    };

    const Container = avoidKeyboard ? KeyboardAvoidingView : View;
    const containerProps = avoidKeyboard
        ? { behavior: Platform.OS === "ios" ? ("padding" as const) : ("height" as const) }
        : {};

    const ContentWrapper = scrollable ? ScrollView : View;
    const contentWrapperProps = scrollable
        ? {
              showsVerticalScrollIndicator: false,
              keyboardShouldPersistTaps: "handled" as const,
              contentContainerStyle: s.scrollContent,
          }
        : {};

    return (
        <Modal
            visible={visible}
            transparent
            statusBarTranslucent
            animationType={isBottomSheet ? "slide" : "fade"}
            onRequestClose={onClose}
            testID={testID}
        >
            <Container
                {...containerProps}
                style={[s.flexFill, isBottomSheet ? s.bottomAlign : s.centerAlign]}
            >
                <TouchableWithoutFeedback onPress={handleBackdropPress}>
                    <View style={[s.backdrop, overlayStyle]} />
                </TouchableWithoutFeedback>

                <View
                    style={[
                        isBottomSheet ? s.sheet : s.card,
                        {
                            maxHeight,
                            ...(isBottomSheet && { paddingBottom: sheetBottomPadding }),
                        },
                        contentStyle,
                    ]}
                >
                    {showHandleBar && (
                        <View style={s.handle}>
                            <View style={[s.handleBar, { backgroundColor: theme.colors.outlineVariant }]} />
                        </View>
                    )}

                    {hasHeader && (
                        <View style={s.header}>
                            {title ? (
                                <Text
                                    style={[s.title, { color: theme.colors.text }]}
                                    numberOfLines={1}
                                >
                                    {title}
                                </Text>
                            ) : (
                                <View style={s.flexFill} />
                            )}
                            <View style={s.headerRight}>
                                {headerRight}
                                {showCloseButton && (
                                    <TouchableOpacity
                                        onPress={onClose}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        accessibilityRole="button"
                                        accessibilityLabel="Close"
                                    >
                                        <X size={22} color={theme.colors.onSurfaceVariant} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    )}

                    <ContentWrapper {...contentWrapperProps} style={s.body}>
                        {children}
                    </ContentWrapper>
                </View>
            </Container>
        </Modal>
    );
}

const createStyles = (theme: any) =>
    StyleSheet.create({
        flexFill: { flex: 1 },
        bottomAlign: { justifyContent: "flex-end" },
        centerAlign: { justifyContent: "center", paddingHorizontal: 20 },
        backdrop: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: "rgba(0,0,0,0.4)",
        },
        sheet: {
            borderTopLeftRadius: theme.shape.extraLarge,
            borderTopRightRadius: theme.shape.extraLarge,
            paddingHorizontal: 24,
            overflow: "hidden",
            backgroundColor: theme.colors.surfaceContainerLow,
            ...theme.elevation.level3,
            shadowColor: theme.colors.shadow,
        },
        card: {
            borderRadius: theme.shape.extraLarge,
            padding: 24,
            overflow: "hidden",
            backgroundColor: theme.colors.surfaceContainerLow,
            ...theme.elevation.level3,
            shadowColor: theme.colors.shadow,
        },
        handle: { alignItems: "center", paddingTop: 12, paddingBottom: 6 },
        handleBar: { width: 32, height: 4, borderRadius: 2 },
        header: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 14,
            paddingBottom: 18,
            gap: 12,
        },
        headerRight: {
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
        },
        title: {
            flex: 1,
            fontSize: 20,
            fontWeight: "700",
            letterSpacing: -0.3,
            color: theme.colors.onSurface,
        },
        body: {
            flexShrink: 1,
        },
        scrollContent: {
            paddingBottom: 8,
        },
    });
