import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/shell/sidebar";
import { AiPanel } from "@/components/shell/ai-panel";
import { GhostProvider } from "@/components/shell/ghost";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const initial = name.charAt(0).toUpperCase();

  return (
    <GhostProvider>
      <div className="bg-blob blob1" style={{ width: 500, height: 500, top: -100, left: 80 }} />
      <div className="bg-blob blob2" style={{ width: 350, height: 350, bottom: -60, right: 200 }} />
      <div className="bg-blob blob3" style={{ width: 280, height: 280, top: "35%", right: 80 }} />

      <div className="relative z-10 flex h-screen">
        <Sidebar userInitial={initial} userName={name} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      <AiPanel />
    </GhostProvider>
  );
}
