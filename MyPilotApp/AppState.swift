import Foundation
import SwiftData

@Observable
class AppState {
    var instances: [Instance] = []
    var currentInstance: Instance?
    var isPaired = false
    
    init() {
        loadInstances()
    }
    
    func loadInstances() {
        if let data = UserDefaults.standard.data(forKey: "instances"),
           let decoded = try? JSONDecoder().decode([Instance].self, from: data) {
            instances = decoded
        }
    }
    
    func saveInstances() {
        if let encoded = try? JSONEncoder().encode(instances) {
            UserDefaults.standard.set(encoded, forKey: "instances")
        }
    }
    
    func addInstance(_ instance: Instance) {
        instances.append(instance)
        saveInstances()
    }
    
    func removeInstance(_ instance: Instance) {
        instances.removeAll { $0.id == instance.id }
        saveInstances()
        if currentInstance?.id == instance.id {
            currentInstance = nil
        }
    }
    
    func selectInstance(_ instance: Instance) {
        currentInstance = instance
    }
}
