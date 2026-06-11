import Foundation

struct Message: Identifiable {
    var id: UUID
    var content: String
    var isFromUser: Bool
    var timestamp: Date
    var isStreaming: Bool
    
    init(
        id: UUID = UUID(),
        content: String,
        isFromUser: Bool,
        timestamp: Date = Date(),
        isStreaming: Bool = false
    ) {
        self.id = id
        self.content = content
        self.isFromUser = isFromUser
        self.timestamp = timestamp
        self.isStreaming = isStreaming
    }
}
