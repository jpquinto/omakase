export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative min-h-screen bg-oma-bg-deep">
      {/* Subtle animated radial gradient overlay for depth */}
      <div
        className="pointer-events-none fixed inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(244,114,182,0.08), transparent 60%), " +
            "radial-gradient(ellipse 60% 50% at 80% 100%, rgba(129,140,248,0.06), transparent 50%), " +
            "radial-gradient(ellipse 50% 40% at 10% 80%, rgba(248,113,113,0.05), transparent 50%)",
        }}
      />
      {children}
    </div>
  );
}
