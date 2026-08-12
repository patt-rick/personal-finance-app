import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import AppDialog from "./AppDialog";
import {
    AppAlertButton,
    DialogRequest,
    currentDialog,
    dismissCurrentDialog,
    subscribeDialogs,
} from "./appAlert";

export default function AppDialogHost() {
    const [request, setRequest] = React.useState<DialogRequest | null>(null);

    React.useEffect(() => subscribeDialogs(() => setRequest(currentDialog())), []);

    if (!request) return null;

    const handleButtonPress = (button: AppAlertButton) => {
        dismissCurrentDialog();
        button.onPress?.();
    };

    const handleCancelDismiss = () => {
        if (!request.cancelable) return;
        dismissCurrentDialog();
        request.buttons.find((b) => b.style === "cancel")?.onPress?.();
        request.onDismiss?.();
    };

    return (
        <Modal
            visible
            transparent
            statusBarTranslucent
            animationType="fade"
            onRequestClose={handleCancelDismiss}
        >
            <View style={styles.overlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleCancelDismiss} />
                <AppDialog
                    tone={request.tone}
                    title={request.title}
                    message={request.message}
                    buttons={request.buttons}
                    onButtonPress={handleButtonPress}
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 32,
        backgroundColor: "rgba(0,0,0,0.4)",
    },
});
