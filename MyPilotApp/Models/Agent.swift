import Foundation

struct Agent: Identifiable, Codable, Hashable {
    var id: String
    var name: String
    var creatureDescription: String
    var model: String?
    var isActive: Bool
    
    init(
        id: String = UUID().uuidString,
        name: String,
        creatureDescription: String = "",
        model: String? = nil,
        isActive: Bool = true
    ) {
        self.id = id
        self.name = name
        self.creatureDescription = creatureDescription
        self.model = model
        self.isActive = isActive
    }
}
