"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MainNav } from "@/components/layout/main-nav"
import { Medal, Trophy, Zap, Hash, Target, History, Star } from "lucide-react"
import { UserAvatar } from "@/components/user-avatar"
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
    <div className="min-h-screen bg-background pb-32">
      <MainNav />
      <header className="premium-header">
        <div className="max-w-md mx-auto flex items-center justify-between h-14">
          <div className="flex items-center gap-3 overflow-visible">
            <div className="relative h-10 w-10 shrink-0 drop-shadow-xl">
              <Image src="/logo.png" alt="Arena Logo" fill className="object-contain" priority />
            </div>
            <div className="overflow-visible">
              <h1 className="text-xl sm:text-2xl leading-none flex items-center gap-1 uppercase overflow-visible">
                <span className="premium-gold-gradient-heading">GLOBAL</span> <span className="text-foreground font-black italic tracking-tight">STANDINGS</span>
              </h1>
              <p className="text-[9px] uppercase font-black text-muted-foreground tracking-[0.2em] mt-0.5">Top Players</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <ModeToggle />
            <NotificationBell />
            <PwaInstallButton />
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto mt-6 px-4 space-y-4">
        {entries.length === 0 ? (
          <div className="py-32 text-center app-surface-panel border-dashed border-2 mx-2">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-10" />
            <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-[0.3em]">Competition starts soon.</p>
          </div>
        ) : (
          <div className="space-y-3.5 px-0.5">
            {entries.map((entry, i) => {
              const rank = i + 1
              const isTopThree = rank <= 3
              const isCurrentUser = entry.user_id === user?.id

              return (
                <div 
                  key={entry.user_id} 
                  className={cn(
                    "app-glass-card p-4 group overflow-visible relative transition-all duration-300",
                    isTopThree ? "border-primary/20 shadow-lg shadow-primary/5" : "border-border/40",
                    isCurrentUser && "ring-2 ring-primary ring-offset-2 dark:ring-offset-background"
                  )}
                >
                  {isCurrentUser && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 premium-gold-pill px-3 py-0.5 text-[8px] rounded-full shadow-lg z-10 border border-background">
                      YOU
                    </div>
                  )}

                  <div className="flex items-center gap-3 sm:gap-4 overflow-visible">
                    {/* Rank Badge */}
                    <div className="w-8 shrink-0 flex flex-col items-center justify-center">
                      {rank === 1 ? (
                        <Trophy className="h-7 w-7 text-yellow-500 fill-yellow-500 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                      ) : rank === 2 ? (
                        <Medal className="h-6 w-6 text-slate-400 fill-slate-400" />
                      ) : rank === 3 ? (
                        <Medal className="h-6 w-6 text-orange-400 fill-orange-400" />
                      ) : (
                        <span className="text-sm font-black text-muted-foreground opacity-30 italic">#{rank}</span>
                      )}
                    </div>
                    
                    {/* Avatar */}
                    <UserAvatar 
                      profile={entry} 
                      className={cn(
                        "h-12 w-12 sm:h-14 sm:w-14 shrink-0 shadow-lg border-2 border-background",
                        isTopThree && "ring-1 ring-primary/20"
                      )} 
                    />

                    {/* Name & Metadata */}
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5 overflow-visible">
                      <span className={cn(
                        "font-black text-base uppercase tracking-tight truncate block leading-tight",
                        isCurrentUser ? "premium-gold-gradient-heading" : "text-foreground"
                      )}>
                        {entry.display_name}
                      </span>
                      <div className="flex items-center gap-1.5 opacity-60">
                        <Hash className="h-2.5 w-2.5 text-muted-foreground" />
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none">
                          {entry.total_predictions} Picks
                        </span>
                      </div>
                    </div>

                    {/* Points Pill */}
                    <div className="shrink-0 flex flex-col items-end gap-0.5">
                       <div className="flex items-center gap-1.5 bg-foreground text-background px-3 py-1.5 rounded-2xl shadow-xl transition-transform group-hover:scale-105">
                          <Trophy className="h-3 w-3 fill-background/10 text-primary" />
                          <span className="text-lg font-black italic tabular-nums leading-none tracking-tighter">{entry.total_points}</span>
                       </div>
                       <span className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] mr-1 opacity-50">PTS</span>
                    </div>
                  </div>
                  
                  {/* Detailed Stats Grid */}
                  <div className="mt-4 pt-4 border-t border-border/10 grid grid-cols-2 gap-y-3 gap-x-4 px-1 overflow-visible">
                     <div className="flex items-center gap-2.5 overflow-visible">
                        <div className="h-7 w-7 rounded-lg bg-primary/5 flex items-center justify-center shrink-0 border border-primary/10">
                           <Target className="h-3.5 w-3.5 text-primary opacity-60" />
                        </div>
                        <div className="flex flex-col min-w-0 overflow-visible">
                            <span className="text-[8px] font-black text-muted-foreground/60 uppercase tracking-widest leading-none">Accuracy</span>
                            <span className="premium-gold-gradient-number text-[11px] leading-tight mt-0.5">{entry.prediction_points} <span className="text-[8px] not-italic opacity-40 uppercase ml-0.5">pts</span></span>
                        </div>
                     </div>

                     <div className="flex items-center gap-2.5 overflow-visible">
                        <div className="h-7 w-7 rounded-lg bg-primary/5 flex items-center justify-center shrink-0 border border-primary/10">
                           <Zap className="h-3.5 w-3.5 text-primary opacity-60" />
                        </div>
                        <div className="flex flex-col min-w-0 overflow-visible">
                            <span className="text-[8px] font-black text-muted-foreground/60 uppercase tracking-widest leading-none">Modifiers</span>
                            <span className={cn(
                              "text-[11px] font-black italic leading-tight mt-0.5",
                              (entry.manual_points + (entry.starting_points || 0)) > 0 ? "text-emerald-500" : (entry.manual_points + (entry.starting_points || 0)) < 0 ? "text-red-500" : "text-muted-foreground/40"
                            )}>
                              { (entry.manual_points + (entry.starting_points || 0)) > 0 ? '+' : '' }{entry.manual_points + (entry.starting_points || 0)} <span className="text-[8px] not-italic opacity-40 uppercase ml-0.5">pts</span>
                            </span>
                        </div>
                     </div>

                     <div className="flex items-center gap-2.5 overflow-visible col-span-2">
                        <div className="h-7 w-7 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 border border-border/40">
                           <History className="h-3.5 w-3.5 text-muted-foreground/60" />
                        </div>
                        <div className="flex flex-col min-w-0 overflow-visible">
                           <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest leading-none">Last Activity</span>
                           <span className="text-[10px] font-bold text-muted-foreground/80 italic mt-0.5">
                             {entry.last_prediction_at ? DateTime.fromISO(entry.last_prediction_at).toRelative() : 'Awaiting Debut'}
                           </span>
                        </div>
                     </div>
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
