import Foundation

struct Instance: Codable, Identifiable, Hashable {
    var id: UUID
    var name: String
    var serverURL: String
    var deviceId: String
    var token: String
    var pairedAt: Date
    var lastUsedAt: Date
    
    init(
        id: UUID = UUID(),
        name: String,
        serverURL: String,
        deviceId: String,
        token: String
    ) {
        self.id = id
        self.name = name
        self.serverURL = serverURL
        self.deviceId = deviceId
        self.token = token
        self.pairedAt = Date()
        self.lastUsedAt = Date()
    }
    
    var wsURL: String {
        serverURL
            .replacingOccurrences(of: "http://", with: "ws://")
            .replacingOccurrences(of: "https://", with: "wss://")
    }
}
