import React, { useCallback, useRef } from "react";
import * as Clipboard from "expo-clipboard";
import { ClipboardPaste } from "lucide-react-native";
import { appAlert } from "../../../components/dialog";
import { useTheme } from "../../../theme/theme";
import { ingestPastedText, PasteResult } from "../services/ingestion/pasteIngest";
import { NavRow } from "./AutoLogRows";

interface Props {
    onLogged?: () => void;
    last?: boolean;
}

function describe(result: PasteResult): { title: string; message: string } {
    const draft = result.draft;
    const amount = draft
        ? `${draft.currencyCode ? `${draft.currencyCode} ` : ""}${draft.amount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
          })}`
        : "";
    switch (result.outcome) {
        case "saved":
            return {
                title: draft?.type === "income" ? "Income logged" : "Expense logged",
                message: `${amount} (${draft?.description}) was added to your cashbooks.`,
            };
        case "review":
            return {
                title: "Sent to review",
                message: `${amount} is waiting in the Review Queue. Confirm it there to save it.`,
            };
        case "duplicate":
            return {
                title: "Already logged",
                message: "This message was logged before, so it wasn't added again.",
            };
        case "not-financial":
            return {
                title: "No transaction found",
                message: "The copied text doesn't look like a bank or MoMo transaction. Copy the whole SMS and try again.",
            };
        default:
            return {
                title: "Nothing copied",
                message: "Copy a bank or MoMo SMS in Messages first, then tap Paste an SMS.",
            };
    }
}

export default function PasteSmsRow({ onLogged, last }: Props) {
    const theme = useTheme();
    const busy = useRef(false);

    const handlePaste = useCallback(async () => {
        if (busy.current) return;
        busy.current = true;
        try {
            const text = await Clipboard.getStringAsync();
            const result = await ingestPastedText(text ?? "");
            const { title, message } = describe(result);
            appAlert(title, message, undefined, {
                tone: result.outcome === "saved" ? "success" : "info",
            });
            if (result.outcome === "saved" || result.outcome === "review") onLogged?.();
        } catch {
            appAlert("Couldn't read the SMS", "Expense Tracker couldn't read your clipboard. Try copying the message again.");
        } finally {
            busy.current = false;
        }
    }, [onLogged]);

    return (
        <NavRow
            icon={<ClipboardPaste size={18} color={theme.colors.onTertiaryContainer} />}
            iconBg={theme.colors.tertiaryContainer}
            title="Paste an SMS"
            subtitle="Log a copied bank or MoMo message"
            onPress={handlePaste}
            last={last}
        />
    );
}
