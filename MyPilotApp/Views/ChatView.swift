import SwiftUI

struct ChatView: View {
    let instance: Instance
    @State private var wsService = WebSocketService()
    @State private var messageText = ""
    @State private var messages: [Message] = []
    @State private var isConnected = false

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Circle().fill(Color.accentColor).frame(width: 28, height: 28)
                    .overlay(Text(String(instance.name.prefix(1))).foregroundStyle(.white).font(.headline))
                Text(instance.name).font(.headline)
                Spacer()
                Circle().fill(isConnected ? Color.green : Color.red).frame(width: 8, height: 8)
                Text(isConnected ? "已连接" : "未连接").font(.caption).foregroundStyle(.secondary)
            }
            .padding()
            .background(.ultraThinMaterial)

            Divider()

            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(messages) { msg in
                            MessageBubble(message: msg)
                        }
                        if wsService.isStreaming {
                            HStack {
                                Text(wsService.streamingContent)
                                    .padding(12)
                                    .background(Color(.controlBackgroundColor))
                                    .cornerRadius(16)
                                Spacer()
                            }
                            .id("streaming")
                        }
                    }
                    .padding()
                }
                .onChange(of: messages.count) { _, _ in
                    withAnimation { proxy.scrollTo(messages.last?.id, anchor: .bottom) }
                }
                .onChange(of: wsService.streamingContent) { _, _ in
                    withAnimation { proxy.scrollTo("streaming", anchor: .bottom) }
                }
            }

            Divider()

            HStack(spacing: 10) {
                TextField("发消息...", text: $messageText, axis: .vertical)
                    .textFieldStyle(.plain)
                    .padding(10)
                    .background(Color(.controlBackgroundColor))
                    .cornerRadius(20)
                    .lineLimit(1...5)

                Button(action: sendMessage) {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 32))
                        .foregroundStyle(messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? .secondary : .accentColor)
                }
                .buttonStyle(.plain)
                .disabled(messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            .padding()
        }
        .onAppear {
            wsService.connect(to: instance)
            observeService()
        }
        .onDisappear {
            wsService.disconnect()
        }
    }

    private func observeService() {
        Task {
            while true {
                await MainActor.run {
                    isConnected = wsService.isConnected
                    if !wsService.receivedMessages.isEmpty {
                        messages = wsService.receivedMessages
                    }
                }
                try? await Task.sleep(nanoseconds: 500_000_000)
            }
        }
    }

    private func sendMessage() {
        let text = messageText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        let userMsg = Message(content: text, isFromUser: true)
        messages.append(userMsg)
        wsService.send(text: text)
        messageText = ""
    }
}

struct MessageBubble: View {
    let message: Message

    var body: some View {
        HStack {
            if message.isFromUser {
                Spacer()
                Text(message.content)
                    .padding(12)
                    .background(Color.accentColor)
                    .foregroundStyle(.white)
                    .cornerRadius(16)
                    .contextMenu {
                        Button("复制") {
                            NSPasteboard.general.clearContents()
                            NSPasteboard.general.setString(message.content, forType: .string)
                        }
                    }
            } else {
                VStack(alignment: .leading, spacing: 4) {
                    Text(message.content)
                        .padding(12)
                        .background(Color(.controlBackgroundColor))
                        .cornerRadius(16)
                        .contextMenu {
                            Button("复制") {
                                NSPasteboard.general.clearContents()
                                NSPasteboard.general.setString(message.content, forType: .string)
                            }
                        }
                }
                Spacer()
            }
        }
        .textSelection(.enabled)
    }
}
