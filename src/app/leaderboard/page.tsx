"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MainNav } from "@/components/layout/main-nav"
import { Medal, Trophy, Zap, Hash, Target, History, Star, LayoutGrid, List as ListIcon, ChevronRight, Goal } from "lucide-react"
import { UserAvatar } from "@/components/user-avatar"
import { PwaInstallButton } from "@/components/pwa-install-button"
import { ModeToggle } from "@/components/mode-toggle"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { NotificationBell } from "@/components/layout/notification-bell"
import { DateTime } from "luxon"
import { AppLoadingScreen } from "@/components/layout/app-loading-screen"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "next/image"

type ViewMode = "card" | "list"

export default function Leaderboard() {
  const { user, profile, loading: authLoading } = useAuth()
  const [entries, setEntries] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>("card")
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
          scorer_prediction_points,
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

  const topThree = entries.slice(0, 3)
  const theRest = entries.slice(3)

  return (
    <div className="min-h-screen bg-background pb-32">
      <MainNav />
      <header className="premium-header">
        <div className="max-w-md mx-auto flex items-center justify-between h-14">
          <div className="flex items-center gap-3 overflow-visible">
            <div className="relative h-9 w-9 shrink-0 drop-shadow-xl">
              <Image src="/logo.png" alt="Arena Logo" fill className="object-contain" priority />
            </div>
            <div className="overflow-visible">
              <h1 className="text-xl sm:text-2xl leading-none flex items-center gap-1 uppercase overflow-visible">
                <span className="premium-gold-gradient-heading">LEADER</span> <span className="text-foreground font-black italic tracking-tight">BOARD</span>
              </h1>
              <p className="text-[8px] uppercase font-black text-muted-foreground tracking-[0.2em] mt-0.5">Global Rankings</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <ModeToggle />
            <NotificationBell />
            <PwaInstallButton />
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto mt-4 px-4 space-y-5">
        {/* View Switcher */}
        <div className="flex justify-center px-1">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full">
            <TabsList className="grid grid-cols-2 h-11 rounded-2xl bg-muted/40 p-1 border border-amber-200/20 dark:border-white/5 shadow-sm">
              <TabsTrigger value="card" className="rounded-xl data-[state=active]:premium-gold-gradient-bg data-[state=active]:text-black transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                <LayoutGrid className="h-3.5 w-3.5" /> Spotlight
              </TabsTrigger>
              <TabsTrigger value="list" className="rounded-xl data-[state=active]:premium-gold-gradient-bg data-[state=active]:text-black transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                <ListIcon className="h-3.5 w-3.5" /> Podium
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {entries.length === 0 ? (
          <div className="py-32 text-center app-surface-panel border-dashed border-2 mx-2">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-10" />
            <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-[0.3em]">Competition starts soon.</p>
          </div>
        ) : viewMode === "card" ? (
          <div className="space-y-4 px-0.5">
            {entries.map((entry, i) => (
              <LeaderboardCard 
                key={entry.user_id} 
                entry={entry} 
                rank={i + 1} 
                currentUserId={user?.id} 
              />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Podium Stage */}
            <div className="flex items-end justify-center gap-2 pt-10 pb-4 h-[220px] relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.1),transparent_70%)] pointer-events-none" />
              
              {/* Rank 2 */}
              {topThree[1] && (
                <PodiumSpot entry={topThree[1]} rank={2} isCurrentUser={topThree[1].user_id === user?.id} />
              )}
              
              {/* Rank 1 */}
              {topThree[0] && (
                <PodiumSpot entry={topThree[0]} rank={1} isCurrentUser={topThree[0].user_id === user?.id} />
              )}
              
              {/* Rank 3 */}
              {topThree[2] && (
                <PodiumSpot entry={topThree[2]} rank={3} isCurrentUser={topThree[2].user_id === user?.id} />
              )}
            </div>

            {/* List for the rest */}
            <div className="bg-white/60 dark:bg-muted/10 rounded-[2.5rem] border border-amber-200/30 dark:border-white/5 overflow-hidden shadow-xl">
              <div className="divide-y divide-amber-100/50 dark:divide-white/5">
                {entries.map((entry, i) => {
                  if (i < 0) return null; // placeholder for header logic
                  const rank = i + 1;
                  const isCurrentUser = entry.user_id === user?.id;
                  
                  return (
                    <div 
                      key={entry.user_id} 
                      className={cn(
                        "flex items-center gap-4 px-5 py-4 transition-colors",
                        isCurrentUser ? "bg-primary/5 dark:bg-primary/10" : "hover:bg-muted/20"
                      )}
                    >
                      <span className={cn(
                        "w-6 text-[11px] font-black italic text-muted-foreground/40",
                        rank <= 3 && "text-primary/60"
                      )}>
                        #{rank}
                      </span>
                      <UserAvatar profile={entry} className="h-10 w-10 shrink-0 border-0 shadow-md" />
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-black text-xs uppercase truncate",
                          isCurrentUser ? "premium-gold-gradient-heading leading-tight" : "text-foreground"
                        )}>
                          {entry.display_name}
                        </p>
                        <p className="text-[8px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-0.5">
                          {entry.total_predictions} Picks
                        </p>
                      </div>
                      <div className="flex items-center gap-2 bg-foreground text-background px-3 py-1.5 rounded-xl shadow-lg">
                        <Trophy className="h-2.5 w-2.5 text-primary" />
                        <span className="text-sm font-black italic tabular-nums leading-none tracking-tighter">
                          {entry.total_points}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function PodiumSpot({ entry, rank, isCurrentUser }: { entry: any, rank: number, isCurrentUser: boolean }) {
  const isFirst = rank === 1;
  const isSecond = rank === 2;
  
  return (
    <div className={cn(
      "flex flex-col items-center flex-1 transition-all duration-700 animate-in fade-in slide-in-from-bottom-4",
      isFirst ? "z-20 scale-110 -translate-y-4" : "z-10 opacity-90",
      isSecond ? "order-1" : isFirst ? "order-2" : "order-3"
    )}>
      <div className="relative mb-2">
        <UserAvatar 
          profile={entry} 
          className={cn(
            "border-4 border-background shadow-2xl",
            isFirst ? "h-20 w-20 ring-2 ring-primary/40" : "h-16 w-16"
          )} 
        />
        <div className={cn(
          "absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center border-2 border-background shadow-lg",
          rank === 1 ? "premium-gold-gradient-bg text-black" : 
          rank === 2 ? "bg-slate-300 dark:bg-slate-500 text-black" : 
          "bg-orange-400 dark:bg-orange-600 text-black"
        )}>
          {rank === 1 ? <Trophy className="h-4 w-4" /> : <span className="text-[10px] font-black italic">#{rank}</span>}
        </div>
      </div>
      
      <div className="text-center w-full max-w-[100px] overflow-hidden">
        <p className={cn(
          "text-[10px] font-black uppercase truncate",
          isCurrentUser ? "premium-gold-gradient-heading" : "text-foreground"
        )}>
          {entry.display_name}
        </p>
        <div className="mt-1 flex items-center justify-center gap-1 bg-foreground text-background px-2 py-0.5 rounded-lg shadow-md inline-flex mx-auto">
          <span className="text-[11px] font-black italic tabular-nums leading-none tracking-tighter">
            {entry.total_points}
          </span>
          <span className="text-[6px] font-black uppercase opacity-60">pts</span>
        </div>
      </div>
    </div>
  )
}

function LeaderboardCard({ entry, rank, currentUserId }: { entry: any, rank: number, currentUserId?: string }) {
  const isTopThree = rank <= 3
  const isCurrentUser = entry.user_id === currentUserId

  return (
    <div 
      className={cn(
        "relative overflow-hidden bg-white/95 dark:bg-card/60 border border-amber-200/60 dark:border-border/50 rounded-[2rem] p-4 group transition-all duration-300 shadow-[0_18px_45px_rgba(120,80,20,0.10)] dark:shadow-xl",
        isCurrentUser && "ring-2 ring-amber-400/80 shadow-[0_20px_50px_rgba(245,160,20,0.18)]"
      )}
    >
      {/* Premium Gradient Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,180,40,0.10),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(120,80,30,0.05),transparent_35%)] pointer-events-none" />

      {isCurrentUser && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 premium-gold-pill px-3 py-0.5 text-[8px] rounded-full shadow-2xl z-20 border border-background/20">
          YOU
        </div>
      )}

      <div className="flex items-center gap-3 sm:gap-4 overflow-visible relative z-10">
        <div className="w-6 shrink-0 flex flex-col items-center justify-center">
          {rank === 1 ? (
            <Trophy className="h-7 w-7 text-yellow-500 fill-yellow-500 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
          ) : rank === 2 ? (
            <Medal className="h-6 w-6 text-slate-400 fill-slate-400" />
          ) : rank === 3 ? (
            <Medal className="h-6 w-6 text-orange-400 fill-orange-400" />
          ) : (
            <span className="text-[10px] font-black text-muted-foreground/30 italic">#{rank}</span>
          )}
        </div>
        
        <UserAvatar 
          profile={entry} 
          className={cn(
            "h-14 w-14 shrink-0 shadow-xl border-4 border-background",
            isTopThree && "ring-1 ring-primary/20"
          )} 
        />

        <div className="flex-1 min-w-0 flex flex-col gap-0.5 overflow-visible">
          <span className={cn(
            "font-black text-lg uppercase tracking-tight truncate block leading-tight",
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

        <div className="shrink-0 flex flex-col items-end gap-1">
           <div className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-2xl shadow-xl transition-transform group-hover:scale-105 active:scale-95">
              <Trophy className="h-3 w-3 text-primary" />
              <span className="text-xl font-black italic tabular-nums leading-none tracking-tighter">{entry.total_points}</span>
           </div>
           <span className="text-[7px] font-black text-muted-foreground uppercase tracking-[0.2em] mr-1 opacity-50">PTS</span>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-amber-100/50 dark:border-white/5 grid grid-cols-2 gap-y-3 gap-x-4 px-1 relative z-10">
         <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary/5 dark:bg-primary/10 flex items-center justify-center shrink-0 border border-primary/10">
               <Target className="h-3.5 w-3.5 text-primary opacity-70" />
            </div>
            <div className="flex flex-col min-w-0">
                <span className="text-[8px] font-black text-slate-500 dark:text-muted-foreground/50 uppercase tracking-widest leading-none">Accuracy</span>
                <span className="premium-gold-gradient-number text-[11px] leading-tight mt-0.5">{entry.prediction_points} <span className="text-[8px] not-italic opacity-40 uppercase ml-0.5">pts</span></span>
            </div>
         </div>

         <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary/5 dark:bg-primary/10 flex items-center justify-center shrink-0 border border-primary/10">
               <Goal className="h-3.5 w-3.5 text-primary opacity-70" />
            </div>
            <div className="flex flex-col min-w-0">
                <span className="text-[8px] font-black text-slate-500 dark:text-muted-foreground/50 uppercase tracking-widest leading-none">Scorer P</span>
                <span className="premium-gold-gradient-number text-[11px] leading-tight mt-0.5">{entry.scorer_prediction_points || 0} <span className="text-[8px] not-italic opacity-40 uppercase ml-0.5">pts</span></span>
            </div>
         </div>

         <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary/5 dark:bg-primary/10 flex items-center justify-center shrink-0 border border-primary/10">
               <Zap className="h-3.5 w-3.5 text-primary fill-primary opacity-70" />
            </div>
            <div className="flex flex-col min-w-0">
                <span className="text-[8px] font-black text-slate-500 dark:text-muted-foreground/50 uppercase tracking-widest leading-none">Modifiers</span>
                <span className={cn(
                  "text-[11px] font-black italic leading-tight mt-0.5",
                  (entry.manual_points + (entry.starting_points || 0)) > 0 ? "text-emerald-500" : (entry.manual_points + (entry.starting_points || 0)) < 0 ? "text-red-500" : "text-slate-400 dark:text-muted-foreground/30"
                )}>
                  { (entry.manual_points + (entry.starting_points || 0)) > 0 ? '+' : '' }{entry.manual_points + (entry.starting_points || 0)} <span className="text-[8px] not-italic opacity-40 uppercase ml-0.5">pts</span>
                </span>
            </div>
         </div>

         <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-muted/40 dark:bg-muted/20 flex items-center justify-center shrink-0 border border-amber-100/50 dark:border-white/5">
               <History className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
            <div className="flex flex-col min-w-0">
               <span className="text-[8px] font-black text-slate-500 dark:text-muted-foreground/50 uppercase tracking-widest leading-none">Last Pulse</span>
               <span className="text-[10px] font-bold text-slate-600 dark:text-muted-foreground/70 italic mt-0.5">
                 {entry.last_prediction_at ? DateTime.fromISO(entry.last_prediction_at).toRelative() : 'Awaiting Debut'}
               </span>
            </div>
         </div>
      </div>
    </div>
  )
}
