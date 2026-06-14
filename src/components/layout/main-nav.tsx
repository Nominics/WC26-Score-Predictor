"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Trophy, Calendar, LayoutGrid, Activity, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", icon: Calendar, label: "Fixtures" },
  { href: "/leaderboard", icon: Trophy, label: "Ranking" },
  { href: "/matrix", icon: LayoutGrid, label: "Matrix" },
  { href: "/activity", icon: Activity, label: "Feed" },
  { href: "/rules", icon: BookOpen, label: "Rules" },
]

export function MainNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-gray-100 pb-safe md:top-0 md:bottom-auto md:border-t-0 md:border-b">
      <div className="mx-auto flex max-w-md justify-around py-2 px-2 md:max-w-4xl md:justify-end md:gap-8">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-1 transition-all rounded-xl",
                isActive 
                  ? "text-primary bg-primary/5" 
                  : "text-muted-foreground hover:text-foreground hover:bg-gray-50"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
              <span className="text-[10px] font-bold uppercase tracking-tight">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}