export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="bg-blob blob1" style={{ width: 500, height: 500, top: -100, left: 80 }} />
      <div className="bg-blob blob2" style={{ width: 350, height: 350, bottom: -60, right: 200 }} />
      <div className="bg-blob blob3" style={{ width: 280, height: 280, top: "35%", right: 80 }} />
      <main className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </>
  );
}
