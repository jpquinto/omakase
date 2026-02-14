export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative min-h-screen bg-oma-bg-deep">
      {/* Animated gradient blob background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <svg className="absolute h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="blob-blur-pub">
              <feGaussianBlur in="SourceGraphic" stdDeviation="80" />
            </filter>
          </defs>
          <ellipse
            cx="20%"
            cy="25%"
            rx="22%"
            ry="18%"
            fill="rgba(244, 114, 182, 0.08)"
            filter="url(#blob-blur-pub)"
            style={{ animation: "oma-blob-drift-1 25s ease-in-out infinite" }}
          />
          <ellipse
            cx="75%"
            cy="20%"
            rx="18%"
            ry="22%"
            fill="rgba(129, 140, 248, 0.07)"
            filter="url(#blob-blur-pub)"
            style={{ animation: "oma-blob-drift-2 30s ease-in-out infinite" }}
          />
          <ellipse
            cx="55%"
            cy="55%"
            rx="20%"
            ry="16%"
            fill="rgba(251, 191, 36, 0.05)"
            filter="url(#blob-blur-pub)"
            style={{ animation: "oma-blob-drift-3 28s ease-in-out infinite" }}
          />
          <ellipse
            cx="30%"
            cy="75%"
            rx="16%"
            ry="20%"
            fill="rgba(248, 113, 113, 0.06)"
            filter="url(#blob-blur-pub)"
            style={{ animation: "oma-blob-drift-4 32s ease-in-out infinite" }}
          />
          <ellipse
            cx="80%"
            cy="70%"
            rx="14%"
            ry="18%"
            fill="rgba(110, 231, 183, 0.05)"
            filter="url(#blob-blur-pub)"
            style={{ animation: "oma-blob-drift-1 35s ease-in-out infinite reverse" }}
          />
        </svg>
      </div>
      {children}
    </div>
  );
}
