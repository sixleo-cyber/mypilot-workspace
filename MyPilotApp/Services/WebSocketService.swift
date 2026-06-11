import Foundation

@Observable
class WebSocketService: NSObject {
    var isConnected = false
    var receivedMessages: [Message] = []
    var streamingContent: String = ""
    var isStreaming = false
    
    private var webSocketTask: URLSessionWebSocketTask?
    private var session: URLSession?
    private var reconnectTimer: Timer?
    private var pingTimer: Timer?
    
    private var instance: Instance?
    
    func connect(to instance: Instance) {
        self.instance = instance
        disconnect()
        
        let urlString = "\(instance.wsURL)/?deviceId=\(instance.deviceId)&token=\(instance.token)"
        guard let url = URL(string: urlString) else { return }
        
        let config = URLSessionConfiguration.default
        session = URLSession(configuration: config, delegate: self, delegateQueue: OperationQueue())
        
        guard let session = session else { return }
        webSocketTask = session.webSocketTask(with: url)
        webSocketTask?.resume()
        
        receiveMessage()
        startPing()
    }
    
    func disconnect() {
        pingTimer?.invalidate()
        reconnectTimer?.invalidate()
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        session = nil
        isConnected = false
    }
    
    func send(text: String) {
        guard let task = webSocketTask, isConnected else { return }
        
        let frame: [String: Any] = [
            "type": "chat.send",
            "payload": [
                "content": text
            ],
            "id": UUID().uuidString,
            "timestamp": Int(Date().timeIntervalSince1970)
        ]
        
        guard let jsonData = try? JSONSerialization.data(withJSONObject: frame),
              let jsonString = String(data: jsonData, encoding: .utf8) else { return }
        
        task.send(.string(jsonString)) { error in
            if let error = error {
                print("[WS] Send error: \(error.localizedDescription)")
            }
        }
    }
    
    private func receiveMessage() {
        guard let task = webSocketTask else { return }
        
        task.receive { [weak self] result in
            guard let self = self else { return }
            
            switch result {
            case .success(let message):
                self.handleMessage(message)
                self.receiveMessage()
                
            case .failure(let error):
                print("[WS] Receive error: \(error.localizedDescription)")
                DispatchQueue.main.async {
                    self.isConnected = false
                    self.scheduleReconnect()
                }
            }
        }
    }
    
    private func handleMessage(_ message: URLSessionWebSocketTask.Message) {
        switch message {
        case .string(let text):
            parseMessage(text)
        case .data(let data):
            if let text = String(data: data, encoding: .utf8) {
                parseMessage(text)
            }
        @unknown default:
            break
        }
    }
    
    private func parseMessage(_ text: String) {
        guard let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }
        
        let type = json["type"] as? String ?? ""
        
        DispatchQueue.main.async {
            switch type {
            case "hello":
                self.isConnected = true
                
            case "chat.stream":
                if let payload = json["payload"] as? [String: Any],
                   let delta = payload["delta"] as? String {
                    self.streamingContent += delta
                    self.isStreaming = true
                }
                
            case "chat.complete":
                if !self.streamingContent.isEmpty {
                    let msg = Message(content: self.streamingContent, isFromUser: false)
                    self.receivedMessages.append(msg)
                    self.streamingContent = ""
                    self.isStreaming = false
                }
                
            case "error":
                let errorMsg = (json["payload"] as? [String: Any])?["error"] as? String ?? "未知错误"
                let msg = Message(content: "❌ \(errorMsg)", isFromUser: false)
                self.receivedMessages.append(msg)
                
            default:
                break
            }
        }
    }
    
    private func startPing() {
        pingTimer = Timer.scheduledTimer(withTimeInterval: 25, repeats: true) { [weak self] _ in
            self?.webSocketTask?.sendPing { error in
                if error != nil {
                    DispatchQueue.main.async {
                        self?.isConnected = false
                        self?.scheduleReconnect()
                    }
                }
            }
        }
    }
    
    private func scheduleReconnect() {
        reconnectTimer?.invalidate()
        reconnectTimer = Timer.scheduledTimer(withTimeInterval: 3, repeats: false) { [weak self] _ in
            if let instance = self?.instance {
                self?.connect(to: instance)
            }
        }
    }
}

extension WebSocketService: URLSessionWebSocketDelegate {
    func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didOpenWithProtocol protocol: String?) {
        DispatchQueue.main.async {
            self.isConnected = true
        }
    }
    
    func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didCloseWith closeCode: URLSessionWebSocketTask.CloseCode, reason: Data?) {
        DispatchQueue.main.async {
            self.isConnected = false
            self.scheduleReconnect()
        }
    }
}
