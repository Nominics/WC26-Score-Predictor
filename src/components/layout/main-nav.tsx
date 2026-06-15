
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Grid2X2, Trophy, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/matrix", icon: Grid2X2, label: "Matrix" },
  { href: "/leaderboard", icon: Trophy, label: "Ranking" },
  { href: "/rules", icon: BookOpen, label: "Rules" },
]

export function MainNav() {
  const pathname = usePathname()

  return (
    <div className="nav-pill">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300",
              isActive ? "active-pill" : "text-gray-400 hover:text-white"
            )}
          >
            <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
            <span className="sr-only">{item.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
