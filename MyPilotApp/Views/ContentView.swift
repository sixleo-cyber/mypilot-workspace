import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        NavigationSplitView {
            SidebarView()
        } detail: {
            if let instance = appState.currentInstance {
                ChatView(instance: instance)
            } else {
                WelcomeView()
            }
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AppState())
}
