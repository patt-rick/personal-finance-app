// Expo config plugin that re-injects the hand-written SMS/notification auto-log
// native module on every `expo prebuild`, so regenerating android/ never drops it.
//
// Source of truth for the Kotlin is ./autolog-src/*.kt (package line rewritten to
// the app's android.package at prebuild time). The plugin also registers
// AutoLogPackage in MainApplication and adds the receiver/service + permissions to
// AndroidManifest. All mods are idempotent.
const {
    withDangerousMod,
    withMainApplication,
    withAndroidManifest,
    AndroidConfig,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const SRC_DIR = "autolog-src";

// Launcher icons this project commits as hand-composed .png (see commit af9c960).
// prebuild regenerates them as .webp from android.adaptiveIcon, and Android's
// resource merger then fails because ic_launcher.webp and ic_launcher.png resolve
// to the same resource name.
const GENERATED_LAUNCHER_WEBP = [
    "ic_launcher.webp",
    "ic_launcher_foreground.webp",
    "ic_launcher_round.webp",
];

const AUTOLOG_PERMISSIONS = [
    "android.permission.READ_SMS",
    "android.permission.RECEIVE_SMS",
    "android.permission.POST_NOTIFICATIONS",
];

function getPackage(config) {
    const pkg = config.android && config.android.package;
    if (!pkg) {
        throw new Error("[withAutoLog] android.package must be set in app config");
    }
    return pkg;
}

// 1. Copy Kotlin sources into <package>/autolog, rewriting only the package line.
function withAutoLogSources(config) {
    return withDangerousMod(config, [
        "android",
        async (config) => {
            const pkg = getPackage(config);
            const srcDir = path.join(__dirname, SRC_DIR);
            const destDir = path.join(
                config.modRequest.platformProjectRoot,
                "app/src/main/java",
                ...pkg.split("."),
                "autolog",
            );
            fs.mkdirSync(destDir, { recursive: true });
            for (const file of fs.readdirSync(srcDir)) {
                if (!file.endsWith(".kt")) continue;
                const contents = fs
                    .readFileSync(path.join(srcDir, file), "utf8")
                    .replace(/^package\s+[\w.]+\.autolog/m, `package ${pkg}.autolog`);
                fs.writeFileSync(path.join(destDir, file), contents);
            }
            return config;
        },
    ]);
}

// 2. Register AutoLogPackage() in MainApplication.kt (idempotent).
function withAutoLogPackageRegistration(config) {
    return withMainApplication(config, (config) => {
        const pkg = getPackage(config);
        let contents = config.modResults.contents;
        const importLine = `import ${pkg}.autolog.AutoLogPackage`;

        if (!contents.includes(importLine)) {
            contents = contents.replace(/^(package .+)$/m, `$1\n\n${importLine}`);
        }

        if (!contents.includes("AutoLogPackage()")) {
            if (/val packages = PackageList\(this\)\.packages/.test(contents)) {
                // Standard Kotlin template: block body with a `val packages` local.
                contents = contents.replace(
                    /(val packages = PackageList\(this\)\.packages)/,
                    "$1\n              packages.add(AutoLogPackage())",
                );
            } else if (/PackageList\(this\)\.packages\.apply\s*\{/.test(contents)) {
                // Expression body with an apply { } block.
                contents = contents.replace(
                    /(PackageList\(this\)\.packages\.apply\s*\{)/,
                    "$1\n              add(AutoLogPackage())",
                );
            } else {
                throw new Error(
                    "[withAutoLog] Could not find a getPackages() insertion point in MainApplication.kt",
                );
            }
        }

        config.modResults.contents = contents;
        return config;
    });
}

// 3. Add permissions + SmsReceiver receiver + NotificationListener service (idempotent).
function withAutoLogManifest(config) {
    config = AndroidConfig.Permissions.withPermissions(config, AUTOLOG_PERMISSIONS);

    return withAndroidManifest(config, (config) => {
        const pkg = getPackage(config);
        const application = config.modResults.manifest.application[0];

        const receiverName = `${pkg}.autolog.SmsReceiver`;
        const serviceName = `${pkg}.autolog.NotificationListener`;

        // Match both fully-qualified and short (".autolog.X") forms so a pre-existing
        // committed manifest entry is replaced, not duplicated.
        const nameOf = (node) => (node.$ && node.$["android:name"]) || "";

        application.receiver = (application.receiver || []).filter(
            (r) => !nameOf(r).endsWith("autolog.SmsReceiver"),
        );
        application.receiver.push({
            $: {
                "android:name": receiverName,
                "android:exported": "true",
                "android:permission": "android.permission.BROADCAST_SMS",
            },
            "intent-filter": [
                {
                    $: { "android:priority": "999" },
                    action: [
                        { $: { "android:name": "android.provider.Telephony.SMS_RECEIVED" } },
                    ],
                },
            ],
        });

        application.service = (application.service || []).filter(
            (s) => !nameOf(s).endsWith("autolog.NotificationListener"),
        );
        application.service.push({
            $: {
                "android:name": serviceName,
                "android:label": "@string/app_name",
                "android:permission": "android.permission.BIND_NOTIFICATION_LISTENER_SERVICE",
                "android:exported": "false",
            },
            "intent-filter": [
                {
                    action: [
                        {
                            $: {
                                "android:name":
                                    "android.service.notification.NotificationListenerService",
                            },
                        },
                    ],
                },
            ],
        });

        return config;
    });
}

// 4. Delete the .webp launcher icons prebuild regenerates, keeping the committed
// .png set. This is a dangerous mod registered by a user plugin, so it runs after
// the core withAndroidIcons base mod that writes the .webp files.
function withStripLauncherWebp(config) {
    return withDangerousMod(config, [
        "android",
        async (config) => {
            const resDir = path.join(
                config.modRequest.platformProjectRoot,
                "app/src/main/res",
            );
            if (!fs.existsSync(resDir)) return config;

            let removed = 0;
            for (const dir of fs.readdirSync(resDir)) {
                if (!dir.startsWith("mipmap-")) continue;
                for (const name of GENERATED_LAUNCHER_WEBP) {
                    const file = path.join(resDir, dir, name);
                    if (fs.existsSync(file)) {
                        fs.rmSync(file);
                        removed += 1;
                    }
                }
            }
            if (removed > 0) {
                console.log(
                    `[withAutoLog] stripped ${removed} generated launcher .webp icon(s) to keep the committed .png icons and avoid duplicate-resource clashes`,
                );
            }
            return config;
        },
    ]);
}

module.exports = function withAutoLog(config) {
    config = withAutoLogSources(config);
    config = withAutoLogPackageRegistration(config);
    config = withAutoLogManifest(config);
    config = withStripLauncherWebp(config);
    return config;
};
