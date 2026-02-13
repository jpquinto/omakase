import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="neo-card rounded-none px-12 py-10 text-center">
        <h1 className="mb-4 text-5xl font-black tracking-tight text-neo-foreground">
          Welcome to AutoForge
        </h1>
        <p className="mb-8 text-lg text-neo-muted-foreground">
          Autonomous development platform
        </p>
        <Link
          href="/projects"
          className="neo-btn inline-block rounded-none bg-neo-primary px-8 py-3 text-lg text-neo-primary-foreground"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}
