import Foundation

// Layout must match src/features/autoLogging/services/ingestion/iosInbox/constants.ts.
enum AutoLogInbox {
    static let appGroup = "group.com.patrickackom.financetracker"
    static let maxBodyChars = 4000
    static let maxSenderChars = 64
    static let maxPendingFiles = 500

    static func save(body: String, sender: String?) -> String {
        let fileManager = FileManager.default
        guard let container = fileManager.containerURL(forSecurityApplicationGroupIdentifier: appGroup) else {
            return "Expense Tracker couldn't open its storage."
        }
        let root = container.appendingPathComponent("autolog", isDirectory: true)
        guard fileManager.fileExists(atPath: root.appendingPathComponent("enabled").path) else {
            return "SMS logging is off. Turn it on in Expense Tracker > Settings > Automatic Logging."
        }

        let text = String(body.trimmingCharacters(in: .whitespacesAndNewlines).prefix(maxBodyChars))
        guard !text.isEmpty else { return "There was no message text to log." }
        let from = sender
            .map { String($0.trimmingCharacters(in: .whitespacesAndNewlines).prefix(maxSenderChars)) }
            .flatMap { $0.isEmpty ? nil : $0 }

        let inbox = root.appendingPathComponent("inbox", isDirectory: true)
        do {
            try fileManager.createDirectory(at: inbox, withIntermediateDirectories: true)
            // Leftover .tmp files from a killed run are never read by the app, so they are
            // left alone rather than risk deleting one a parallel run is about to move.
            let names = try fileManager.contentsOfDirectory(atPath: inbox.path)
            guard names.filter({ $0.hasSuffix(".json") }).count < maxPendingFiles else {
                return "Expense Tracker has too many unprocessed messages. Open the app to catch up."
            }

            let id = UUID().uuidString
            let now = Int64((Date().timeIntervalSince1970 * 1000).rounded())
            var entry: [String: Any] = ["v": 1, "id": id, "body": text, "timestamp": now]
            if let from { entry["sender"] = from }
            let data = try JSONSerialization.data(withJSONObject: entry)

            let tmp = inbox.appendingPathComponent(".\(id).tmp")
            try data.write(to: tmp)
            try fileManager.moveItem(at: tmp, to: inbox.appendingPathComponent("\(id).json"))

            let stamp = try JSONSerialization.data(withJSONObject: ["at": now, "hasSender": from != nil])
            try? stamp.write(to: root.appendingPathComponent("last-capture"), options: .atomic)
            return "Sent to Expense Tracker."
        } catch {
            return "Expense Tracker couldn't save this message."
        }
    }
}
