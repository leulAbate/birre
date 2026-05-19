"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Landmark,
  Target,
  Settings,
  LogOut,
  CalendarDays,
  Inbox,
  Activity,
  Sparkles,
  RefreshCw,
} from "lucide-react"

const navItems = [
  { href: "/dashboard",     label: "Dashboard",    icon: LayoutDashboard },
  { href: "/monthly",       label: "Monthly",      icon: CalendarDays },
  { href: "/pulse",         label: "Pulse",        icon: Activity },
  { href: "/insights",      label: "Insights",     icon: Sparkles },
  { href: "/inbox",         label: "Inbox",        icon: Inbox },
  { href: "/transactions",  label: "Transactions", icon: ArrowLeftRight },
  { href: "/subscriptions", label: "Recurring",    icon: RefreshCw },
  { href: "/budgets",       label: "Budgets",      icon: PieChart },
  { href: "/accounts",      label: "Accounts",     icon: Landmark },
  { href: "/goals",         label: "Goals",        icon: Target },
]

function NavIcon({
  icon: Icon,
  active,
  badge,
}: {
  icon: React.ElementType
  active: boolean
  badge?: number
}) {
  return (
    <span
      className={`relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-150 ${
        active
          ? "nav-active-gloss text-white"
          : "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
      }`}
    >
      <Icon className="w-[18px] h-[18px]" />
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </span>
  )
}

export default function Sidebar({ userEmail, inboxCount = 0 }: { userEmail: string; inboxCount?: number }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const initial = userEmail.charAt(0).toUpperCase()

  return (
    <TooltipProvider delay={200}>
      <aside className="flex flex-col w-[64px] shrink-0 h-screen bg-sidebar border-r border-sidebar-border items-center py-4">
        {/* Logo */}
        <Tooltip>
          <TooltipTrigger
            className="btn-gloss w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/30 mb-5 cursor-default"
          >
            <span className="text-white text-sm font-bold">B</span>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>Birr&apos;e</TooltipContent>
        </Tooltip>

        {/* Nav */}
        <nav className="flex-1 flex flex-col items-center gap-1 w-full px-2.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/")
            const badge = href === "/inbox" ? inboxCount : undefined
            return (
              <Tooltip key={href}>
                <TooltipTrigger
                  render={<Link href={href} />}
                  className="w-full flex justify-center"
                >
                  <NavIcon icon={Icon} active={active} badge={badge} />
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>{label}</TooltipContent>
              </Tooltip>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="flex flex-col items-center gap-1 w-full px-2.5">
          <Tooltip>
            <TooltipTrigger
              render={<Link href="/settings" />}
              className="w-full flex justify-center"
            >
              <span
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-150 ${
                  pathname.startsWith("/settings")
                    ? "nav-active-gloss text-white"
                    : "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <Settings className="w-[18px] h-[18px]" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>Settings</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={<button onClick={handleSignOut} />}
              className="w-full flex justify-center"
            >
              <span className="w-10 h-10 flex items-center justify-center rounded-xl text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
                <LogOut className="w-[18px] h-[18px]" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>Sign out</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger className="cursor-default">
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-semibold text-primary mt-1 select-none">
                {initial}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>{userEmail}</TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  )
}
