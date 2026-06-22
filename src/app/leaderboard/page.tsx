
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MainNav } from "@/components/layout/main-nav"
import { Medal, Loader2, Trophy, Zap, Star, Hash } from "lucide-react"
import { UserAvatar } from "@/components/user-avatar"
import { ProfileSheet } from "@/components/profile/profile-sheet"
import { PwaInstallButton } from "@/components/pwa-install-button"
import { ModeToggle } from "@/components/mode-toggle"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { NotificationBell } from "@/components/layout/notification-bell"
import { DateTime } from "luxon"
import { AppLoadingScreen } from "@/components/layout/app-loading-screen"
import Image from "next/image"

export default function Leaderboard() {
  const { user, profile, stats, loading: authLoading } = useAuth()
  const [entries, setEntries] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && user && profile && !profile.display_name) {
      router.replace("/onboarding")
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    if (!authLoading) {
      fetchLeaderboard()
      
      const channel = supabase
        .channel('leaderboard-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchLeaderboard())
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
  }, [authLoading])

  const fetchLeaderboard = async () => {
    try {
      const { data: lbData, error: lbError } = await supabase
        .from("leaderboard")
        .select(`
          user_id, 
          display_name, 
          favorite_team,
          profile_icon_key,
          starting_points, 
          prediction_points, 
          manual_points,
          total_points, 
          total_predictions, 
          last_prediction_at
        `)
        .order("total_points", { ascending: false })
        .order("total_predictions", { ascending: false })
      
      if (lbError) throw lbError
      setEntries(lbData || [])
    } catch (err: any) {
      console.error("Leaderboard fetch error:", err.message)
    } finally {
      setLoadingData(false)
    }
  }

  if (authLoading || (loadingData && entries.length === 0)) {
    return <AppLoadingScreen />
  }

  return (
    <div className="min-h-screen pb-32">
      <MainNav />
      <header className="premium-header">
        <div className="max-w-2xl mx-auto flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 drop-shadow-xl">
              <Image src="/logo.png" alt="Arena Logo" fill className="object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-black italic tracking-tighter text-foreground uppercase leading-none flex items-center gap-1">
                GLOBAL <span className="text-primary">STANDINGS</span>
              </h1>
              <p className="text-[9px] uppercase font-black text-muted-foreground tracking-[0.2em] mt-0.5">Top Players</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <NotificationBell />
            <PwaInstallButton />
            <ProfileSheet />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto mt-10 px-4">
        {entries.length === 0 ? (
          <div className="p-32 text-center app-surface-panel border-dashed border-2 mx-4">
            <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-6 opacity-10" />
            <p className="text-muted-foreground font-bold uppercase text-[11px] tracking-[0.3em]">Competition starts soon.</p>
          </div>
        ) : (
          <div className="space-y-4 px-2">
            {entries.map((entry, i) => {
              const rank = i + 1
              const isTopThree = rank <= 3
              const isCurrentUser = entry.user_id === user?.id

              return (
                <div 
                  key={entry.user_id} 
                  className={cn(
                    "app-glass-card p-7 group",
                    isTopThree ? "border-primary/30 ring-1 ring-primary/5" : "border-border/50",
                    isCurrentUser && "ring-2 ring-primary/40 ring-offset-4 dark:ring-offset-slate-900"
                  )}
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 flex flex-col items-center justify-center">
                      {rank === 1 ? (
                        <Trophy className="h-9 w-9 text-yellow-500 fill-yellow-500 animate-bounce drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
                      ) : rank === 2 ? (
                        <Medal className="h-8 w-8 text-slate-400 fill-slate-400" />
                      ) : rank === 3 ? (
                        <Medal className="h-8 w-8 text-orange-400 fill-orange-400" />
                      ) : (
                        <span className="text-lg font-black text-muted-foreground opacity-30 italic">#{rank}</span>
                      )}
                    </div>
                    
                    <UserAvatar 
                      profile={entry} 
                      className={cn("h-14 w-14 shadow-xl", isTopThree && "ring-2 ring-primary/30")} 
                    />

                    <div className="flex-1 min-w-0">
                      <span className={cn(
                        "font-black text-base uppercase tracking-tight truncate block",
                        isCurrentUser ? "text-primary italic" : "text-foreground"
                      )}>
                        {entry.display_name}
                      </span>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1 rounded-full border border-border/40 shadow-inner">
                            <Hash className="h-2.5 w-2.5 text-muted-foreground" />
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tight">
                              {entry.total_predictions} <span className="opacity-40">Picks</span>
                            </span>
                        </div>
                        {entry.starting_points > 0 && (
                          <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                             <Zap className="h-2.5 w-2.5 text-primary fill-primary" />
                             <span className="text-[9px] font-black text-primary uppercase italic tracking-tighter">Bonus (+{entry.starting_points})</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end min-w-[80px]">
                       <div className="flex items-center gap-2 bg-foreground text-background px-5 py-2.5 rounded-[1.5rem] shadow-xl group-hover:scale-105 transition-transform">
                          <Trophy className="h-4 w-4 fill-background/10" />
                          <span className="text-xl font-black italic tabular-nums leading-none tracking-tighter">{entry.total_points}</span>
                       </div>
                       <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-1.5 mr-1.5">PTS</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-5 border-t border-border/40 flex justify-between items-center px-2">
                     <div className="flex gap-6">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-50">Accuracy</span>
                            <span className="text-[11px] font-black text-foreground italic">{entry.prediction_points} <span className="text-[9px] not-italic opacity-40 uppercase ml-0.5">pts</span></span>
                        </div>
                        {entry.manual_points !== 0 && (
                          <div className="flex flex-col">
                              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-50">Modifiers</span>
                              <span className={cn(
                                "text-[11px] font-black italic",
                                entry.manual_points > 0 ? "text-green-500" : "text-red-500"
                              )}>
                                {entry.manual_points > 0 ? '+' : ''}{entry.manual_points} <span className="text-[9px] not-italic opacity-40 uppercase ml-0.5">pts</span>
                              </span>
                          </div>
                        )}
                     </div>
                     <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">
                       Activity: {entry.last_prediction_at ? DateTime.fromISO(entry.last_prediction_at).toRelative() : 'None'}
                     </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
