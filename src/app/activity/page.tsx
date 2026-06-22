"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MainNav } from "@/components/layout/main-nav"
import { Zap, Loader2, Star, TrendingUp, TrendingDown, Clock, ShieldCheck, Activity, ChevronRight } from "lucide-react"
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
    <div className="min-h-screen pb-32">
      <MainNav />
      <header className="premium-header">
        <div className="max-w-2xl mx-auto flex justify-between items-center h-14">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 drop-shadow-xl">
              <Image src="/logo.png" alt="Arena Logo" fill className="object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-black italic tracking-tighter flex items-center gap-1 text-foreground leading-none uppercase">
                MATCH <span className="text-primary">PULSE</span>
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                 <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">Live Activity</p>
                 {stats && (
                   <div className="flex items-center gap-1.5">
                     <span className="h-0.5 w-0.5 rounded-full bg-border" />
                     <span className="text-[9px] font-black text-primary uppercase italic">Rank #{stats.rank}</span>
                   </div>
                 )}
              </div>
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

      <main className="p-4 space-y-4 max-w-2xl mx-auto mt-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4 opacity-50">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.4em]">Syncing Feed...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-32 app-surface-panel border-2 border-dashed mx-4">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">No activity in the Arena yet</p>
          </div>
        ) : (
          <div className="space-y-3 px-2">
            {logs.map((log) => {
              const isManualAdjustment = log.action === 'manual_points_awarded'
              const isFixtureUpdate = log.action === 'fixture_time_updated'
              
              return (
                <div key={log.id} className="app-glass-card p-5 group flex items-center gap-4 transition-all hover:scale-[1.01] hover:bg-card/80 border-border/40">
                  <div className="relative">
                    <UserAvatar profile={log} className="h-12 w-12 shadow-lg group-hover:scale-105 transition-transform" />
                    {isManualAdjustment && <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1 shadow-lg border border-background"><Star className="h-2.5 w-2.5 text-yellow-950 fill-yellow-950" /></div>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <p className="text-xs">
                          <span className="font-black text-foreground uppercase mr-1">{log.display_name}</span>
                          <span className="text-muted-foreground font-bold lowercase opacity-70">
                            {isManualAdjustment 
                              ? (log.points_awarded > 0 ? 'received a bonus' : 'received an adjustment')
                              : isFixtureUpdate ? 'updated a match schedule' : (log.action === 'prediction_created' ? 'locked in' : 'updated') + ' a pick'
                            }
                          </span>
                        </p>
                        {isManualAdjustment ? (
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className={cn(
                              "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black italic uppercase shadow-sm border",
                              log.points_awarded > 0 ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"
                            )}>
                               {log.points_awarded > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                               {log.points_awarded > 0 ? '+' : ''}{log.points_awarded} PTS
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground italic truncate max-w-[120px]">"{log.reason}"</span>
                          </div>
                        ) : isFixtureUpdate ? (
                          <div className="flex flex-col gap-1.5 mt-1">
                             <p className="font-black text-foreground uppercase italic text-[14px] tracking-tight">
                               {log.home_team} <span className="text-primary text-[10px] mx-1">VS</span> {log.away_team}
                             </p>
                             <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-2.5 py-0.5 w-fit">
                                <Clock className="h-3 w-3 text-primary" />
                                <span className="text-[8px] font-black text-primary uppercase">K.O. UPDATED: {DateTime.fromISO(log.new_time).toFormat('HH:mm')}</span>
                             </div>
                          </div>
                        ) : (
                          <p className="font-black text-primary uppercase italic text-[14px] tracking-tight group-hover:text-foreground transition-colors mt-0.5">
                            {log.home_team} vs {log.away_team}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 min-w-[70px]">
                    <span className="text-[8px] text-muted-foreground font-black uppercase bg-muted/50 px-2 py-1 rounded-full whitespace-nowrap opacity-60">
                      {hasMounted ? DateTime.fromISO(log.created_at).toRelative() : '...'}
                    </span>
                    {isFixtureUpdate ? (
                      <ShieldCheck className="h-3.5 w-3.5 text-primary opacity-60" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/20 group-hover:translate-x-1 transition-transform" />
                    )}
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
