import SwiftUI

struct SettingsRow: View {
    let icon: String
    let color: Color
    let title: String
    var subtitle: String? = nil
    var showChevron: Bool = true

    var body: some View {
        HStack(spacing: Spacing.md) {
            IconBlock(icon: icon, color: color)
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(title)
                    .font(AppTypography.body)
                if let subtitle {
                    Text(subtitle)
                        .font(AppTypography.data)
                        .foregroundStyle(AppColors.ink400)
                }
            }
            Spacer()
            if showChevron {
                Image(systemName: "chevron.right")
                    .font(.system(size: 12))
                    .foregroundStyle(AppColors.ink300)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 11)
    }
}

struct SettingsGroup<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        VStack(spacing: 0) {
            content
        }
        .background(AppColors.surfaceCard)
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
        .overlay(
            RoundedRectangle(cornerRadius: AppRadius.md)
                .stroke(AppColors.separatorLine, lineWidth: 0.5)
        )
        .padding(.horizontal, Spacing.lg)
    }
}
