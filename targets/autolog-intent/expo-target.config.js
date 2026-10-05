// App Intents extension that receives SMS text from a Shortcuts "When I receive a
// message" automation and drops it into the App Group inbox the app drains.
// apple-targets hard-codes this target's deployment target (17.0) and version build
// settings; plugins/withIosAutoLogTargetVersion.js keeps the versions in step with the app.
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
    type: "app-intent",
    name: "AutoLogIntent",
    displayName: "Expense Tracker SMS",
    bundleIdentifier: ".autologintent",
    entitlements: {
        "com.apple.security.application-groups":
            config.ios.entitlements["com.apple.security.application-groups"],
    },
});
