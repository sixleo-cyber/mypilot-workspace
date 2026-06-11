import SwiftUI

struct SidebarView: View {
    @EnvironmentObject var appState: AppState
    @State private var showAddInstance = false
    
    var body: some View {
        List(selection: Binding(
            get: { appState.currentInstance?.id },
            set: { id in
                if let id = id {
                    appState.currentInstance = appState.instances.first { $0.id == id }
                }
            }
        )) {
            Section("OpenClaw 实例") {
                ForEach(appState.instances) { instance in
                    InstanceRow(instance: instance)
                        .tag(instance.id)
                        .contextMenu {
                            Button(role: .destructive) {
                                appState.removeInstance(instance)
                            } label: {
                                Label("删除", systemImage: "trash")
                            }
                        }
                }
            }
        }
        .listStyle(.sidebar)
        .overlay(alignment: .bottom) {
            Button(action: { showAddInstance = true }) {
                Label("添加实例", systemImage: "plus.circle.fill")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .padding()
        }
        .sheet(isPresented: $showAddInstance) {
            AddInstanceView()
        }
    }
}

struct InstanceRow: View {
    let instance: Instance
    
    var body: some View {
        HStack(spacing: 10) {
            Circle()
                .fill(Color.accentColor)
                .frame(width: 32, height: 32)
                .overlay(
                    Text(String(instance.name.prefix(1)))
                        .font(.headline)
                        .foregroundStyle(.white)
                )
            
            VStack(alignment: .leading, spacing: 2) {
                Text(instance.name)
                    .font(.headline)
                Text(instance.serverURL)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    SidebarView()
        .environmentObject(AppState())
}
