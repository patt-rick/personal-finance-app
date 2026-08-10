import { registerRootComponent } from "expo";
import {
    registerWidgetTaskHandler,
    registerWidgetConfigurationScreen,
} from "react-native-android-widget";
import App from "./App";
import { widgetTaskHandler } from "./src/features/widgets/widgetTaskHandler";
import { WidgetConfigScreen } from "./src/features/widgets/screens/WidgetConfigScreen";

registerRootComponent(App);
registerWidgetTaskHandler(widgetTaskHandler);
registerWidgetConfigurationScreen(WidgetConfigScreen);
