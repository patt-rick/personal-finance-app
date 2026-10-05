import AppIntents

struct LogSmsTransactionIntent: AppIntent {
    static let title: LocalizedStringResource = "Log SMS Transaction"
    static let description: IntentDescription = IntentDescription(
        "Sends a bank or mobile money SMS to Expense Tracker so it can be logged. Nothing leaves your iPhone."
    )
    // Must stay false: the extension has no UI, and opening the app per SMS defeats the point.
    static let openAppWhenRun = false

    @Parameter(title: "Message")
    var message: String

    @Parameter(title: "Sender")
    var sender: String?

    static var parameterSummary: some ParameterSummary {
        Summary("Log \(\.$message) from \(\.$sender)")
    }

    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        return .result(value: AutoLogInbox.save(body: message, sender: sender))
    }
}

@main
struct AutoLogIntentExtension: AppIntentsExtension {}
