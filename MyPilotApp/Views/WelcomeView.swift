import SwiftUI

struct WelcomeView: View {
    @EnvironmentObject var appState: AppState
    @State private var showAddInstance = false
    
    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            
            Image(systemName: "antenna.radiowaves.left.and.right")
                .font(.system(size: 64))
                .foregroundStyle(.accent)
            
            Text("MyPilot")
                .font(.largeTitle)
                .fontWeight(.bold)
            
            Text("私有化 OpenClaw 客户端")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            
            if appState.instances.isEmpty {
                VStack(spacing: 12) {
                    Text("还没有添加 OpenClaw 实例")
                        .foregroundStyle(.secondary)
                    
                    Button(action: { showAddInstance = true }) {
                        Label("添加实例", systemImage: "plus.circle.fill")
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                }
                .padding(.top, 8)
            } else {
                Text("请从左侧选择一个实例")
                    .foregroundStyle(.secondary)
            }
            
            Spacer()
            
            Text("v1.0.0 · 数据完全私有")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .sheet(isPresented: $showAddInstance) {
            AddInstanceView()
        }
    }
}

#Preview {
    WelcomeView()
        .environmentObject(AppState())
}
