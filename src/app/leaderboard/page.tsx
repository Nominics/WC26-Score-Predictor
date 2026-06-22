
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
import Image from "next/image"

export default function Leaderboard() {
  const { user, profile, stats, loading: authLoading } = useAuth()
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && user && profile && !profile.display_name) {
      router.replace("/onboarding")
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    fetchLeaderboard()
    
    const channel = supabase
      .channel('leaderboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchLeaderboard())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

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
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      <MainNav />
      <header className="px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-between h-14">
          <div>
            <h1 className="text-xl font-black italic tracking-tighter text-foreground uppercase leading-none flex items-center gap-2">
              <div className="relative h-6 w-6 shrink-0">
                <Image src="/logo.png" alt="Arena Logo" fill className="object-contain" />
              </div>
              THE <span className="text-primary">LEADERBOARD</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
               <p className="text-[8px] uppercase font-black text-muted-foreground tracking-widest">Global Standings</p>
               {stats && (
                 <div className="flex items-center gap-1.5">
                   <span className="h-0.5 w-0.5 rounded-full bg-border" />
                   <span className="text-[9px] font-black text-primary uppercase italic">Rank #{stats.rank}</span>
                   <span className="text-[9px] font-black text-foreground uppercase">({stats.points} pts)</span>
                   <span className="h-0.5 w-0.5 rounded-full bg-border" />
                   <div className="flex items-center gap-1 bg-yellow-500/10 px-1.5 py-0.5 rounded-full border border-yellow-500/20">
                      <Zap className="h-2 w-2 text-yellow-500 fill-yellow-500" />
                      <span className="text-[8px] font-black text-yellow-600">{stats.lifelines}</span>
                   </div>
                 </div>
               )}
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

      <main className="max-w-2xl mx-auto mt-8 px-4">
        {loading ? (
          <div className="p-20 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em]">Syncing Rankings...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-20 text-center text-muted-foreground font-bold uppercase text-[10px] tracking-widest bg-card rounded-[2.5rem] border-2 border-dashed">
            Competition is yet to begin.
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, i) => {
              const rank = i + 1
              const isTopThree = rank <= 3
              const isCurrentUser = entry.user_id === user?.id

              return (
                <div 
                  key={entry.user_id} 
                  className={cn(
                    "flex flex-col p-6 bg-card rounded-[2.5rem] border transition-all hover:shadow-xl relative overflow-hidden group",
                    isTopThree ? "border-primary/20 shadow-lg" : "border-border shadow-sm",
                    isCurrentUser && "ring-2 ring-primary ring-offset-4 dark:ring-offset-background"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 flex flex-col items-center justify-center">
                      {rank === 1 ? (
                        <div className="relative h-8 w-8 flex items-center justify-center">
                           <Trophy className="h-6 w-6 text-yellow-500 fill-yellow-500 animate-bounce" />
                        </div>
                      ) : rank === 2 ? (
                        <Medal className="h-6 w-6 text-gray-400 fill-gray-400" />
                      ) : rank === 3 ? (
                        <Medal className="h-6 w-6 text-orange-400 fill-orange-400" />
                      ) : (
                        <span className="text-sm font-black text-muted-foreground">#{rank}</span>
                      )}
                    </div>
                    
                    <UserAvatar 
                      profile={entry} 
                      className={cn("h-12 w-12", isTopThree && "border-primary shadow-primary/20")} 
                    />

                    <div className="flex-1 min-w-0">
                      <span className={cn(
                        "font-black text-[14px] uppercase tracking-tight truncate block",
                        isCurrentUser ? "text-primary italic" : "text-foreground"
                      )}>
                        {entry.display_name}
                      </span>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-muted px-2 py-0.5 rounded-full border border-border">
                            <Hash className="h-2.5 w-2.5 text-muted-foreground" />
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">
                              {entry.total_predictions} <span className="opacity-50">Picks</span>
                            </span>
                        </div>
                        {entry.starting_points > 0 && (
                          <div className="flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                             <Zap className="h-2 w-2 text-blue-500 fill-blue-500" />
                             <span className="text-[8px] font-black text-blue-600 uppercase">Late Bonus (+{entry.starting_points})</span>
                          </div>
                        )}
                        {entry.manual_points !== 0 && (
                          <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">
                             <Star className="h-2 w-2 text-yellow-500 fill-yellow-500" />
                             <span className="text-[8px] font-black text-yellow-600 uppercase">({entry.manual_points > 0 ? '+' : ''}{entry.manual_points})</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end min-w-[70px]">
                       <div className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-2xl shadow-xl shadow-primary/10 group-hover:scale-110 transition-transform">
                          <Trophy className="h-3.5 w-3.5 fill-primary-foreground/20" />
                          <span className="text-base font-black italic tabular-nums leading-none">{entry.total_points}</span>
                       </div>
                       <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1 mr-1">PTS</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-border/50 flex justify-between items-center px-2">
                     <div className="flex gap-4">
                        <div className="flex items-center gap-1">
                            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Picks:</span>
                            <span className="text-[9px] font-black text-foreground">{entry.prediction_points}</span>
                        </div>
                        {entry.starting_points > 0 && (
                          <div className="flex items-center gap-1">
                              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Bonus:</span>
                              <span className="text-[9px] font-black text-foreground">+{entry.starting_points}</span>
                          </div>
                        )}
                     </div>
                     <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">
                       Last: {entry.last_prediction_at ? DateTime.fromISO(entry.last_prediction_at).toRelative() : 'None'}
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
