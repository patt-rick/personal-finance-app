import { registerRootComponent } from "expo";
import { registerWidgetTaskHandler } from "react-native-android-widget";
import App from "./App";
import { widgetTaskHandler } from "./src/features/widgets/widgetTaskHandler";

registerRootComponent(App);
registerWidgetTaskHandler(widgetTaskHandler);
