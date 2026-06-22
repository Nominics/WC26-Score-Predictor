
"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getProfileIconPath } from "@/lib/profile-icons"
import { getTeamFlagUrl } from "@/lib/team-flags"
import { cn } from "@/lib/utils"

interface UserAvatarProps {
  profile?: {
    display_name?: string
    favorite_team?: string | null
    profile_icon_key?: string | null
  } | null
  className?: string
  fallbackClassName?: string
}

export function UserAvatar({ profile, className, fallbackClassName }: UserAvatarProps) {
  const getInitials = (name?: string) => {
    if (!name) return "??"
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  const iconPath = getProfileIconPath(profile?.profile_icon_key)
  const flagUrl = getTeamFlagUrl(profile?.favorite_team)
  const initials = getInitials(profile?.display_name)

  return (
    <Avatar className={cn("h-10 w-10 border-2 border-background shadow-md", className)}>
      {iconPath ? (
        <AvatarImage src={iconPath} className="object-cover" />
      ) : flagUrl ? (
        <AvatarImage src={flagUrl} className="object-cover" />
      ) : null}
      <AvatarFallback className={cn("bg-primary/5 text-primary font-black text-[10px]", fallbackClassName)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
