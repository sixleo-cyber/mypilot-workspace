import Foundation

actor APIService {
    static let shared = APIService()
    
    func generatePairingCode(serverURL: String) async throws -> PairingCodeResponse {
        guard let url = URL(string: "\(serverURL)/api/pair/generate") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError
        }
        
        return try JSONDecoder().decode(PairingCodeResponse.self, from: data)
    }
    
    func verifyPairingCode(serverURL: String, code: String) async throws -> PairingVerifyResponse {
        guard let url = URL(string: "\(serverURL)/api/pair/verify") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["code": code]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        if httpResponse.statusCode == 400 {
            let errorResponse = try? JSONDecoder().decode(PairingVerifyResponse.self, from: data)
            if let errorResponse = errorResponse, !errorResponse.valid {
                throw APIError.pairingError(errorResponse.error ?? "配对码无效")
            }
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError
        }
        
        return try JSONDecoder().decode(PairingVerifyResponse.self, from: data)
    }
    
    func getServerInfo(serverURL: String) async throws -> ServerInfoResponse {
        guard let url = URL(string: "\(serverURL)/api/info") else {
            throw APIError.invalidURL
        }
        
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(ServerInfoResponse.self, from: data)
    }
    
    func healthCheck(serverURL: String) async throws -> Bool {
        guard let url = URL(string: "\(serverURL)/api/health") else {
            return false
        }
        
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                return false
            }
            let health = try? JSONDecoder().decode(HealthResponse.self, from: data)
            return health?.status == "ok"
        } catch {
            return false
        }
    }
}

struct PairingCodeResponse: Codable {
    let code: String
    let expiresAt: Int64
    let expiresIn: Int
}

struct PairingVerifyResponse: Codable {
    let valid: Bool
    let deviceId: String?
    let token: String?
    let error: String?
}

struct ServerInfoResponse: Codable {
    let version: String
    let gateway: GatewayInfo?
    let totalDevices: Int
    let activeConnections: Int
    
    struct GatewayInfo: Codable {
        let url: String
        let hasToken: Bool
    }
}

struct HealthResponse: Codable {
    let status: String
    let version: String
}

enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case serverError
    case pairingError(String)
    case networkError(String)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL: return "无效的服务器地址"
        case .invalidResponse: return "服务器响应异常"
        case .serverError: return "服务器错误"
        case .pairingError(let msg): return msg
        case .networkError(let msg): return msg
        }
    }
}
