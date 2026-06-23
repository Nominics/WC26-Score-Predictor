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
          <div className="space-y-4 px-0.5">
            {entries.map((entry, i) => {
              const rank = i + 1
              const isTopThree = rank <= 3
              const isCurrentUser = entry.user_id === user?.id

              return (
                <div 
                  key={entry.user_id} 
                  className={cn(
                    "app-glass-card p-5 group overflow-visible relative transition-all duration-300",
                    isTopThree ? "border-primary/25 shadow-xl shadow-primary/5" : "border-amber-200/60 dark:border-border/40",
                    isCurrentUser && "ring-2 ring-primary ring-offset-4 dark:ring-offset-background shadow-2xl shadow-primary/10"
                  )}
                >
                  {/* Premium Gradient Overlay */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,180,40,0.08),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(120,80,30,0.04),transparent_40%)] pointer-events-none rounded-[inherit]" />

                  {isCurrentUser && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 premium-gold-pill px-4 py-1 text-[9px] rounded-full shadow-2xl z-10 border-2 border-background">
                      YOU
                    </div>
                  )}

                  <div className="flex items-center gap-3 sm:gap-4 overflow-visible relative z-10">
                    {/* Rank Badge */}
                    <div className="w-8 shrink-0 flex flex-col items-center justify-center">
                      {rank === 1 ? (
                        <Trophy className="h-8 w-8 text-yellow-500 fill-yellow-500 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]" />
                      ) : rank === 2 ? (
                        <Medal className="h-7 w-7 text-slate-400 fill-slate-400" />
                      ) : rank === 3 ? (
                        <Medal className="h-7 w-7 text-orange-400 fill-orange-400" />
                      ) : (
                        <span className="text-sm font-black text-muted-foreground/40 italic">#{rank}</span>
                      )}
                    </div>
                    
                    {/* Avatar */}
                    <UserAvatar 
                      profile={entry} 
                      className={cn(
                        "h-14 w-14 shrink-0 shadow-2xl border-4 border-background",
                        isTopThree && "ring-1 ring-primary/30"
                      )} 
                    />

                    {/* Name & Metadata */}
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5 overflow-visible">
                      <span className={cn(
                        "font-black text-lg uppercase tracking-tight truncate block leading-tight",
                        isCurrentUser ? "premium-gold-gradient-heading" : "text-foreground"
                      )}>
                        {entry.display_name}
                      </span>
                      <div className="flex items-center gap-1.5 opacity-70">
                        <Hash className="h-2.5 w-2.5 text-muted-foreground" />
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none">
                          {entry.total_predictions} Picks
                        </span>
                      </div>
                    </div>

                    {/* Points Pill */}
                    <div className="shrink-0 flex flex-col items-end gap-1">
                       <div className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-2xl shadow-2xl transition-transform group-hover:scale-105 active:scale-95">
                          <Trophy className="h-3 w-3 fill-background/20 text-primary" />
                          <span className="text-xl font-black italic tabular-nums leading-none tracking-tighter">{entry.total_points}</span>
                       </div>
                       <span className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.25em] mr-1 opacity-60">PTS</span>
                    </div>
                  </div>
                  
                  {/* Detailed Stats Grid */}
                  <div className="mt-5 pt-5 border-t border-amber-100/50 dark:border-border/10 grid grid-cols-2 gap-y-4 gap-x-5 px-1 overflow-visible relative z-10">
                     <div className="flex items-center gap-3 overflow-visible">
                        <div className="h-8 w-8 rounded-xl bg-primary/5 flex items-center justify-center shrink-0 border border-primary/10">
                           <Target className="h-4 w-4 text-primary opacity-70" />
                        </div>
                        <div className="flex flex-col min-w-0 overflow-visible">
                            <span className="text-[9px] font-black text-slate-500 dark:text-muted-foreground/60 uppercase tracking-widest leading-none">Accuracy</span>
                            <span className="premium-gold-gradient-number text-[12px] leading-tight mt-1">{entry.prediction_points} <span className="text-[9px] not-italic opacity-50 uppercase ml-0.5">pts</span></span>
                        </div>
                     </div>

                     <div className="flex items-center gap-3 overflow-visible">
                        <div className="h-8 w-8 rounded-xl bg-primary/5 flex items-center justify-center shrink-0 border border-primary/10">
                           <Zap className="h-4 w-4 text-primary opacity-70" />
                        </div>
                        <div className="flex flex-col min-w-0 overflow-visible">
                            <span className="text-[9px] font-black text-slate-500 dark:text-muted-foreground/60 uppercase tracking-widest leading-none">Modifiers</span>
                            <span className={cn(
                              "text-[12px] font-black italic leading-tight mt-1",
                              (entry.manual_points + (entry.starting_points || 0)) > 0 ? "text-emerald-500" : (entry.manual_points + (entry.starting_points || 0)) < 0 ? "text-red-500" : "text-slate-400 dark:text-muted-foreground/40"
                            )}>
                              { (entry.manual_points + (entry.starting_points || 0)) > 0 ? '+' : '' }{entry.manual_points + (entry.starting_points || 0)} <span className="text-[9px] not-italic opacity-50 uppercase ml-0.5">pts</span>
                            </span>
                        </div>
                     </div>

                     <div className="flex items-center gap-3 overflow-visible col-span-2">
                        <div className="h-8 w-8 rounded-xl bg-muted/40 dark:bg-muted/20 flex items-center justify-center shrink-0 border border-slate-200 dark:border-border/40">
                           <History className="h-4 w-4 text-muted-foreground/60" />
                        </div>
                        <div className="flex flex-col min-w-0 overflow-visible">
                           <span className="text-[9px] font-black text-slate-400 dark:text-muted-foreground/40 uppercase tracking-widest leading-none">Last Pulse</span>
                           <span className="text-[11px] font-bold text-slate-600 dark:text-muted-foreground/80 italic mt-1">
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
