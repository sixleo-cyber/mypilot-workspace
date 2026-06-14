import SwiftUI

struct IconBlock: View {
    let icon: String
    let color: Color
    var size: CGFloat = 28

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.25)
                .fill(color.opacity(0.10))
            Image(systemName: icon)
                .font(.system(size: size * 0.5, weight: .medium))
                .foregroundStyle(color)
        }
        .frame(width: size, height: size)
    }
}
