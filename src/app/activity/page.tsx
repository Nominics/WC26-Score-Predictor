"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MainNav } from "@/components/layout/main-nav"
import { Radio, Loader2 } from "lucide-react"
import { DateTime } from "lucide-react"
import { ProfileSheet } from "@/components/profile/profile-sheet"
import { PwaInstallButton } from "@/components/pwa-install-button"
import { ModeToggle } from "@/components/mode-toggle"
import { useAuth } from "@/hooks/use-auth"
import { NotificationBell } from "@/components/layout/notification-bell"
import Image from "next/image"
import { DateTime as LuxonDateTime } from "luxon"

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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'predictions' }, () => fetchLogs())
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
              <h1 className="text-xl leading-none flex items-center gap-1 uppercase">
                <span className="premium-gold-gradient-heading">MATCH</span> <span className="text-foreground font-black italic tracking-tight">PULSE</span>
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                 <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">Live Stream</p>
                 {stats && (
                   <div className="flex items-center gap-1.5 overflow-visible">
                     <span className="h-0.5 w-0.5 rounded-full bg-border" />
                     <span className="premium-gold-gradient-heading text-[9px] uppercase italic">Rank #{stats.rank}</span>
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
        <div className="app-glass-card border-primary/10 overflow-visible shadow-2xl">
          <div className="px-6 py-4 bg-muted/30 border-b border-border/40 flex justify-between items-center rounded-t-[2.5rem]">
            <div className="flex items-center gap-3">
              <div className="relative h-2 w-2">
                <span className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
                <span className="relative block h-2 w-2 bg-red-500 rounded-full" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground">Terminal Log</span>
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
              <div className="p-4 sm:p-6 space-y-0.5 overflow-visible">
                {logs.map((log) => {
                  // Filter out redundant prediction updates
                  if (log.event_type === 'prediction_updated' && log.metadata?.old_score === log.metadata?.new_score) return null;

                  let displayTitle = log.title;
                  let displayEmoji = log.emoji || '⚽';

                  if (log.event_type === 'prediction_created') {
                    displayTitle = "PICK LOCKED";
                    displayEmoji = "🔥";
                  } else if (log.event_type === 'prediction_updated') {
                    displayTitle = "PICK EDITED";
                    displayEmoji = "✏️";
                  }

                  return (
                    <div key={log.id} className="flex gap-4 py-2.5 items-center transition-all border-b border-border/5 last:border-0 group -mx-2 px-2 rounded-lg overflow-visible">
                      <span className="shrink-0 text-lg grayscale-[0.4] group-hover:grayscale-0 transition-all scale-95 group-hover:scale-105 duration-300">
                        {displayEmoji}
                      </span>
                      
                      <div className="flex-1 min-w-0 flex items-center gap-3 overflow-visible">
                        <span className="font-mono text-[10px] text-muted-foreground/50 tabular-nums shrink-0">
                          {hasMounted ? LuxonDateTime.fromISO(log.created_at).toLocal().toFormat('HH:mm') : '--:--'}
                        </span>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 overflow-visible">
                          <span className="premium-gold-gradient-heading text-[9px] uppercase tracking-tight min-w-[75px] text-center shrink-0">
                            {displayTitle}
                          </span>
                          <p className="text-[12px] font-medium text-muted-foreground leading-none truncate">
                            {log.message}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                         <Radio className="h-3 w-3 text-primary animate-pulse" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          
          <div className="p-4 bg-muted/20 border-t border-border/40 text-center rounded-b-[2.5rem]">
             <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.4em]">End of Log Stream</p>
          </div>
        </div>
      </main>
    </div>
  )
}