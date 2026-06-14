import SwiftUI

struct StatusDot: View {
    let status: Status
    @State private var isPulsing = false

    enum Status {
        case success, warning, danger, idle
    }

    var color: Color {
        switch status {
        case .success: return AppColors.success
        case .warning: return AppColors.warning
        case .danger: return AppColors.danger
        case .idle: return AppColors.ink300
        }
    }

    var body: some View {
        Circle()
            .fill(color)
            .frame(width: 8, height: 8)
            .overlay(
                Circle()
                    .stroke(color.opacity(0.3), lineWidth: 4)
                    .scaleEffect(isPulsing ? 1.5 : 1)
                    .opacity(isPulsing ? 0 : 1)
            )
            .onAppear {
                withAnimation(.easeOut(duration: 1.5).repeatForever(autoreverses: false)) {
                    isPulsing = true
                }
            }
    }
}
