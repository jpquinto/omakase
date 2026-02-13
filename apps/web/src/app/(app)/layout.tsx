import Link from "next/link";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="neo-border flex w-64 flex-col border-r-2 border-t-0 border-b-0 border-l-0 border-neo-border bg-neo-card">
        {/* Logo */}
        <div className="neo-border border-t-0 border-r-0 border-l-0 border-b-2 border-neo-border px-6 py-5">
          <Link href="/" className="text-2xl font-black tracking-tight">
            AutoForge
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6">
          <ul className="space-y-2">
            <li>
              <Link
                href="/projects"
                className="neo-btn block rounded-none bg-neo-muted px-4 py-2.5 text-sm font-bold text-neo-foreground"
              >
                Projects
              </Link>
            </li>
          </ul>
        </nav>

        {/* User section placeholder */}
        <div className="neo-border border-r-0 border-b-0 border-l-0 border-t-2 border-neo-border px-4 py-4">
          <div className="flex items-center gap-3">
            {/* Avatar placeholder */}
            <div className="neo-border flex h-9 w-9 items-center justify-center rounded-full bg-neo-accent font-bold text-neo-foreground">
              U
            </div>
            <div className="flex-1 truncate text-sm font-semibold">User</div>
            <Link
              href="/api/auth/logout"
              className="text-xs font-bold uppercase tracking-wide text-neo-muted-foreground hover:text-neo-destructive"
            >
              Logout
            </Link>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="neo-border flex h-16 items-center justify-between border-t-0 border-r-0 border-l-0 border-b-2 border-neo-border bg-neo-card px-8">
          <div className="text-sm font-bold uppercase tracking-wider text-neo-muted-foreground">
            Dashboard
          </div>
          <div className="flex items-center gap-4">
            {/* Avatar placeholder */}
            <div className="neo-border flex h-8 w-8 items-center justify-center rounded-full bg-neo-progress text-xs font-bold text-neo-foreground">
              U
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 bg-neo-bg p-8">{children}</main>
      </div>
    </div>
  );
}
