"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Trophy, MessageSquare, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { UserAvatar } from "@/components/user-avatar"

const navItems = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/leaderboard", icon: Trophy, label: "Ranking" },
  { href: "/chat", icon: MessageSquare, label: "Chat" },
  { href: "/rules", icon: BookOpen, label: "Rules" },
]

export function MainNav() {
  const pathname = usePathname()
  const { profile } = useAuth()

  return (
    <div className="nav-pill w-[calc(100%-2rem)] max-w-md h-[72px] px-3 sm:px-6 py-2 flex justify-between items-center">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full transition-all duration-300 relative",
              isActive ? "active-pill" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className={cn("h-[22px] w-[22px] sm:h-6 sm:w-6", isActive && "stroke-[2.5px]")} />
            <span className="sr-only">{item.label}</span>
            {isActive && (
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-black shadow-[0_0_8px_rgba(0,0,0,0.5)]" />
            )}
          </Link>
        )
      })}
      
      {/* Profile item */}
      <Link
        href="/profile"
        className={cn(
          "flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full transition-all duration-300 relative",
          pathname === "/profile" ? "active-pill" : "text-muted-foreground"
        )}
      >
        <UserAvatar 
          profile={profile} 
          className={cn(
            "h-7 w-7 sm:h-8 sm:w-8 border-0 shadow-none transition-all", 
            pathname === "/profile" ? "opacity-100 scale-110" : "opacity-60"
          )} 
        />
        <span className="sr-only">Profile</span>
        {pathname === "/profile" && (
          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-black shadow-[0_0_8px_rgba(0,0,0,0.5)]" />
        )}
      </Link>
    </div>
  )
}
