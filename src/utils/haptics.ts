import * as Haptics from "expo-haptics";

export const hapticSuccess = () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

export const hapticError = () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

export const hapticWarning = () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

export const hapticLight = () =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

export const hapticMedium = () =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
