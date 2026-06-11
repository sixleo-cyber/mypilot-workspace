import SwiftUI

struct AddInstanceView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var appState: AppState

    @State private var serverURL = ""
    @State private var pairingCode = ""
    @State private var instanceName = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var step = 1

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                if step == 1 {
                    step1View
                } else {
                    step2View
                }
            }
            .padding()
            .navigationTitle("添加实例")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }
                }
            }
        }
        .frame(width: 500, height: 450)
    }

    private var step1View: some View {
        VStack(spacing: 16) {
            Image(systemName: "server.rack")
                .font(.system(size: 48))
                .foregroundStyle(.accent)

            Text("输入服务器地址")
                .font(.title2).fontWeight(.semibold)

            TextField("例如: http://118.145.240.41:52378", text: $serverURL)
                .textFieldStyle(.roundedBorder)
                .font(.system(.body, design: .monospaced))

            if let errorMessage {
                Text(errorMessage).foregroundStyle(.red).font(.caption)
            }

            Spacer()

            Button(action: validateServer) {
                if isLoading {
                    ProgressView()
                } else {
                    Text("继续").frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent).controlSize(.large)
            .disabled(serverURL.isEmpty || isLoading)
        }
    }

    private var step2View: some View {
        VStack(spacing: 16) {
            Image(systemName: "key.fill")
                .font(.system(size: 48)).foregroundStyle(.accent)

            Text("输入配对码")
                .font(.title2).fontWeight(.semibold)

            Text("在服务器终端执行 mypilot pair 获取配对码")
                .font(.caption).foregroundStyle(.secondary)

            TextField("配对码（格式: XXXX-XXXX-XXXX）", text: $pairingCode)
                .textFieldStyle(.roundedBorder)
                .font(.system(.body, design: .monospaced))

            TextField("实例名称（可选）", text: $instanceName)
                .textFieldStyle(.roundedBorder)

            if let errorMessage {
                Text(errorMessage).foregroundStyle(.red).font(.caption)
            }

            Spacer()

            HStack {
                Button("返回") { step = 1; errorMessage = nil }
                    .buttonStyle(.bordered).controlSize(.large)

                Button(action: verifyPairing) {
                    if isLoading {
                        ProgressView()
                    } else {
                        Text("配对并连接").frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent).controlSize(.large)
                .disabled(pairingCode.isEmpty || isLoading)
            }
        }
    }

    private func validateServer() {
        guard !serverURL.isEmpty else { return }
        let cleanURL = serverURL.trimmingCharacters(in: .whitespacesAndNewlines)
        let normalizedURL = cleanURL.hasPrefix("http") ? cleanURL : "http://" + cleanURL
        serverURL = normalizedURL
        isLoading = true
        errorMessage = nil
        Task {
            let isHealthy = (try? await APIService.shared.healthCheck(serverURL: normalizedURL)) ?? false
            await MainActor.run {
                if isHealthy {
                    step = 2
                } else {
                    errorMessage = "无法连接服务器，请检查地址"
                }
                isLoading = false
            }
        }
    }

    private func verifyPairing() {
        guard !pairingCode.isEmpty else { return }
        isLoading = true
        errorMessage = nil
        Task {
            do {
                let result = try await APIService.shared.verifyPairingCode(serverURL: serverURL, code: pairingCode)
                await MainActor.run {
                    let name = instanceName.isEmpty ? "MyPilot 实例" : instanceName
                    let instance = Instance(
                        name: name,
                        serverURL: serverURL,
                        deviceId: result.deviceId ?? "",
                        token: result.token ?? ""
                    )
                    appState.addInstance(instance)
                    appState.selectInstance(instance)
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isLoading = false
                }
            }
        }
    }
}
