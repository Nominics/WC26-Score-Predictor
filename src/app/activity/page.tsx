
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MainNav } from "@/components/layout/main-nav"
import { Zap, MessageSquare, Loader2, Star, TrendingUp, TrendingDown, Clock, ShieldCheck, Activity } from "lucide-react"
import { UserAvatar } from "@/components/user-avatar"
import { DateTime } from "luxon"
import { ProfileSheet } from "@/components/profile/profile-sheet"
import { PwaInstallButton } from "@/components/pwa-install-button"
import { ModeToggle } from "@/components/mode-toggle"
import { useAuth } from "@/hooks/use-auth"
import { NotificationBell } from "@/components/layout/notification-bell"
import { cn } from "@/lib/utils"
import Image from "next/image"

export default function ActivityFeed() {
  const { stats } = useAuth()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMounted, setHasMounted] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setHasMounted(true)
    fetchLogs()
    
    const channel = supabase
      .channel('activity-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, () => fetchLogs())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'manual_point_awards' }, () => fetchLogs())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("activity_feed")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40)
      
      if (error) throw error
      setLogs(data || [])
    } catch (err) {
      console.error("Activity fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      <MainNav />
      <header className="px-6 py-4 border-b border-border bg-background/80 backdrop-blur-md shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex justify-between items-center h-14">
          <div>
            <h1 className="text-xl font-black italic tracking-tighter flex items-center gap-2 uppercase text-foreground leading-none">
              <div className="relative h-6 w-6 shrink-0">
                <Image src="/logo.png" alt="Arena Logo" fill className="object-contain" />
              </div>
              LIVE <span className="text-primary">FEED</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
               <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">Match Pulse</p>
               {stats && (
                 <div className="flex items-center gap-1.5">
                   <span className="h-0.5 w-0.5 rounded-full bg-border" />
                   <span className="text-[9px] font-black text-primary uppercase italic">Rank #{stats.rank}</span>
                   <span className="text-[9px] font-black text-foreground uppercase">({stats.points} pts)</span>
                   <span className="h-0.5 w-0.5 rounded-full bg-border" />
                   <div className="flex items-center gap-1 bg-yellow-500/10 px-1.5 py-0.5 rounded-full border border-yellow-500/20">
                      <Zap className="h-2 w-2 text-yellow-500 fill-yellow-500" />
                      <span className="text-[8px] font-black text-yellow-500">{stats.lifelines}</span>
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

      <main className="p-4 space-y-3 max-w-2xl mx-auto mt-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Connecting to Pulse...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-[2.5rem] border-2 border-dashed shadow-inner">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">No activity yet</p>
          </div>
        ) : (
          logs.map((log) => {
            const isManualAdjustment = log.action === 'manual_points_awarded'
            const isFixtureUpdate = log.action === 'fixture_time_updated'
            
            return (
              <div key={log.id} className="flex gap-4 p-6 bg-card rounded-[2rem] border border-border items-center shadow-sm transition-all hover:shadow-lg hover:scale-[1.01] group">
                <UserAvatar profile={log} className="h-12 w-12 group-hover:scale-110 transition-transform" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <p className="text-[11px] truncate">
                        <span className="font-black text-foreground uppercase mr-1">{log.display_name}</span>
                        <span className="text-muted-foreground font-bold lowercase">
                          {isManualAdjustment 
                            ? (log.points_awarded > 0 ? 'received a bonus' : 'received an adjustment')
                            : isFixtureUpdate ? 'updated a match schedule' : (log.action === 'prediction_created' ? 'locked in' : 'updated') + ' a pick'
                          }
                        </span>
                      </p>
                      {isManualAdjustment ? (
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className={cn(
                            "flex items-center gap-1.5 px-3 py-1 rounded-2xl text-[10px] font-black italic uppercase shadow-sm",
                            log.points_awarded > 0 ? "bg-green-500/10 text-green-600 border border-green-500/20" : "bg-red-500/10 text-red-600 border border-red-500/20"
                          )}>
                             {log.points_awarded > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                             {log.points_awarded > 0 ? '+' : ''}{log.points_awarded} Points
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground italic truncate max-w-[140px]">"{log.reason}"</span>
                        </div>
                      ) : isFixtureUpdate ? (
                        <div className="flex flex-col gap-1.5 mt-1.5">
                           <p className="font-black text-foreground uppercase italic text-[15px] tracking-tight">
                             {log.home_team} vs {log.away_team}
                           </p>
                           <div className="flex items-center gap-1.5 bg-primary/5 border border-primary/10 rounded-2xl px-3 py-1 w-fit">
                              <Clock className="h-3 w-3 text-primary" />
                              <span className="text-[9px] font-black text-primary uppercase">New Kickoff: {DateTime.fromISO(log.new_time).toFormat('LLL dd, HH:mm')}</span>
                           </div>
                        </div>
                      ) : (
                        <p className="font-black text-primary uppercase italic text-[15px] tracking-tight group-hover:text-foreground transition-colors mt-0.5">
                          {log.home_team} vs {log.away_team}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end">
                       <span className="text-[9px] text-muted-foreground font-black uppercase bg-muted px-3 py-1 rounded-full whitespace-nowrap shadow-inner">
                        {hasMounted ? DateTime.fromISO(log.created_at).toRelative() : '...'}
                      </span>
                      {isManualAdjustment ? (
                        <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400 mt-2 animate-pulse" />
                      ) : isFixtureUpdate ? (
                        <ShieldCheck className="h-3.5 w-3.5 text-primary mt-2" />
                      ) : (
                        <Activity className="h-3.5 w-3.5 text-muted-foreground/30 mt-2" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </main>
    </div>
  )
}
