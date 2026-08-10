import { registerRootComponent } from "expo";
import App from "./App";

// Widget registration is added in a later task (registerWidgetTaskHandler /
// registerWidgetConfigurationScreen). Keeping app registration isolated here
// mirrors what expo/AppEntry.js does.
registerRootComponent(App);
