// Locks iPhone to portrait without touching Android, which the shared top-level
// `orientation` key would also change (layouts are not built for landscape).
const { withInfoPlist } = require("expo/config-plugins");

module.exports = function withIosPortraitOnly(config) {
    return withInfoPlist(config, (config) => {
        config.modResults.UISupportedInterfaceOrientations = ["UIInterfaceOrientationPortrait"];
        delete config.modResults["UISupportedInterfaceOrientations~ipad"];
        return config;
    });
};
