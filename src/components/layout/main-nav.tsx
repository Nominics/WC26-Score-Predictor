"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Trophy, Calendar, LayoutGrid, Activity, BookOpen, User } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", icon: Calendar, label: "Fixtures" },
  { href: "/leaderboard", icon: Trophy, label: "Ranking" },
  { href: "/matrix", icon: LayoutGrid, label: "Matrix" },
  { href: "/activity", icon: Activity, label: "Activity" },
  { href: "/rules", icon: BookOpen, label: "Rules" },
]

export function MainNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-lg md:top-0 md:bottom-auto">
      <div className="mx-auto flex max-w-md justify-around py-3 px-6 md:max-w-4xl md:justify-end md:gap-8">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors hover:text-secondary",
              pathname === item.href ? "text-secondary font-bold" : "text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] uppercase font-bold tracking-widest">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
