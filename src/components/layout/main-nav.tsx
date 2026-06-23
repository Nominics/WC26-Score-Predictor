"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Grid2X2, Trophy, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { UserAvatar } from "@/components/user-avatar"

const navItems = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/matrix", icon: Grid2X2, label: "Matrix" },
  { href: "/leaderboard", icon: Trophy, label: "Ranking" },
  { href: "/chat", icon: MessageSquare, label: "Chat" },
]

export function MainNav() {
  const pathname = usePathname()
  const { profile } = useAuth()

  return (
    <div className="nav-pill w-[calc(100%-2rem)] max-w-sm h-14 sm:h-16 px-2 sm:px-4 py-1.5 sm:py-2 flex justify-between items-center">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-full transition-all duration-300",
              isActive ? "active-pill" : "text-gray-400 hover:text-white"
            )}
          >
            <item.icon className={cn("h-4 w-4 sm:h-5 sm:w-5", isActive && "stroke-[2.5px]")} />
            <span className="sr-only">{item.label}</span>
          </Link>
        )
      })}
      
      {/* Profile item integrated into navigation */}
      <Link
        href="/profile"
        className={cn(
          "flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-full transition-all duration-300",
          pathname === "/profile" ? "active-pill" : "text-gray-400"
        )}
      >
        <UserAvatar profile={profile} className={cn("h-6 w-6 sm:h-7 sm:w-7 border-0", pathname === "/profile" ? "opacity-100" : "opacity-60")} />
        <span className="sr-only">Profile</span>
      </Link>
    </div>
  )
}
