
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MainNav } from "@/components/layout/main-nav"
import { Radio, Loader2, ChevronRight, Filter } from "lucide-react"
import { DateTime } from "luxon"
import { ProfileSheet } from "@/components/profile/profile-sheet"
import { PwaInstallButton } from "@/components/pwa-install-button"
import { ModeToggle } from "@/components/mode-toggle"
import { useAuth } from "@/hooks/use-auth"
import { NotificationBell } from "@/components/layout/notification-bell"
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
      .channel('match-pulse-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_pulse_events' }, () => fetchLogs())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, () => fetchLogs())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("match_pulse_feed")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60)
      
      if (error) throw error
      setLogs(data || [])
    } catch (err) {
      console.error("Pulse fetch error:", err)
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
                 <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">Live Stream</p>
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

      <main className="max-w-2xl mx-auto mt-8 px-4">
        <div className="app-glass-card border-primary/10 overflow-hidden shadow-2xl">
          <div className="px-6 py-4 bg-muted/30 border-b border-border/40 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="relative h-2 w-2">
                <span className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
                <span className="relative block h-2 w-2 bg-red-500 rounded-full" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground">Live Broadcast Log</span>
            </div>
            <div className="flex items-center gap-2">
               <span className="text-[8px] font-black text-muted-foreground uppercase opacity-40 tabular-nums">AUTO-SYNC ACTIVE</span>
            </div>
          </div>

          <div className="bg-black/[0.02] dark:bg-white/[0.01]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-40 gap-4 opacity-50">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.4em]">Establishing Stream...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-32 mx-4">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Awaiting match action in the Arena</p>
              </div>
            ) : (
              <div className="divide-y divide-border/5 p-4 sm:p-6 space-y-0.5">
                {logs.map((log) => {
                  // Filter out duplicate/noisy prediction updates
                  if (log.event_type === 'prediction_updated' && log.metadata?.old_score === log.metadata?.new_score) return null;

                  return (
                    <div key={log.id} className="group flex gap-4 py-3 items-start transition-all hover:bg-primary/[0.02] -mx-4 px-4 rounded-xl">
                      <span className="shrink-0 text-lg grayscale-[0.4] group-hover:grayscale-0 transition-all scale-95 group-hover:scale-105 duration-300">
                        {log.emoji || '⚽'}
                      </span>
                      
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-muted-foreground/50 tabular-nums">
                            {hasMounted ? DateTime.fromISO(log.created_at).toLocal().toFormat('HH:mm') : '--:--'}
                          </span>
                          <span className="text-[9px] font-black text-foreground uppercase tracking-tight bg-muted/40 px-2 py-0.5 rounded-md">
                            {log.title}
                          </span>
                        </div>
                        <p className="text-[13px] font-medium text-muted-foreground leading-relaxed">
                          {log.message}
                        </p>
                      </div>

                      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Radio className="h-3 w-3 text-primary animate-pulse" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          
          <div className="p-4 bg-muted/20 border-t border-border/40 text-center">
             <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.4em]">End of Stream</p>
          </div>
        </div>
      </main>
    </div>
  )
}
