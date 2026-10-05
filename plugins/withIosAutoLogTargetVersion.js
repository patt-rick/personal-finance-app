// apple-targets hard-codes MARKETING_VERSION 1.0 / CURRENT_PROJECT_VERSION 1 for app-intent
// targets, and App Store Connect warns (ITMS-90473) when an extension's versions differ from
// the app's. Explicit Info.plist keys override the generated ones, so stamp them on prebuild.
// EAS remote autoIncrement rewrites CFBundleVersion in every target's Info.plist afterwards.
const { withDangerousMod } = require("expo/config-plugins");
const plist = require("@expo/plist").default;
const fs = require("fs");
const path = require("path");

const INFO_PLIST = path.join("targets", "autolog-intent", "Info.plist");

module.exports = function withIosAutoLogTargetVersion(config) {
    return withDangerousMod(config, [
        "ios",
        async (config) => {
            const file = path.join(config.modRequest.projectRoot, INFO_PLIST);
            const info = plist.parse(fs.readFileSync(file, "utf8"));
            info.CFBundleShortVersionString = config.version;
            info.CFBundleVersion = String((config.ios && config.ios.buildNumber) || "1");
            fs.writeFileSync(file, plist.build(info));
            return config;
        },
    ]);
};
