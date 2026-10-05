import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { Linking } from "react-native";
import { loadBusinesses } from "../../utils/storage";
import { WIDGET_CLICK } from "./constants";
import { getWidgetBusinessId, removeWidgetMapping } from "./services/widgetConfig";
import { resolveWidgetColors } from "./theme/widgetTheme";
import { buildQuickAddLink } from "./services/deepLink";
import { isWidgetName, loadWidgetInputs, renderWidgetForCashbookId } from "./services/renderWidget";

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
    const widgetName = props.widgetInfo.widgetName;
    const widgetId = props.widgetInfo.widgetId;

    // Handle quick-add tap by opening the app via deep link.
    if (props.clickAction === WIDGET_CLICK.OPEN_QUICK_ADD) {
        const businessId = await getWidgetBusinessId(widgetId);
        await Linking.openURL(buildQuickAddLink(businessId));
        return;
    }

    if (props.widgetAction === "WIDGET_DELETED") {
        await removeWidgetMapping(widgetId);
        return;
    }

    if (!isWidgetName(widgetName)) return;

    const [colors, businessId, businesses, inputs] = await Promise.all([
        resolveWidgetColors(),
        getWidgetBusinessId(widgetId),
        loadBusinesses(),
        loadWidgetInputs(widgetName),
    ]);
    props.renderWidget(renderWidgetForCashbookId(widgetName, businessId, businesses, colors, inputs));
}
