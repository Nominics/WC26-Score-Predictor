
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MainNav } from "@/components/layout/main-nav"
import { Radio, Loader2, Zap } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { useAuth } from "@/hooks/use-auth"
import { NotificationBell } from "@/components/layout/notification-bell"
import Image from "next/image"
import { DateTime } from "luxon"
import { cn } from "@/lib/utils"

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
        .limit(100)
      
      if (error) throw error
      setLogs(data || [])
    } catch (err) {
      console.error("Pulse fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  const cleanMessage = (msg: string, type: string) => {
    if (!msg) return "";
    
    // Clean up scorer updates or JSON-like strings
    if (type === 'scorer_update' || msg.includes('{')) {
      return msg
        .replace(/[{}"']/g, '')
        .replace(/ • /g, ' / ')
        .replace(/: /g, ' — ');
    }
    return msg;
  }

  return (
    <div className="min-h-screen bg-background pb-32 flex flex-col items-center overflow-x-hidden">
      <MainNav />
      <header className="premium-header w-full flex justify-center sticky top-0 z-40">
        <div className="max-w-md w-full flex justify-between items-center h-12 px-4">
          <div className="flex items-center gap-2.5 overflow-visible">
            <div className="relative h-9 w-9 shrink-0 drop-shadow-xl">
              <Image src="/logo.png" alt="Arena Logo" fill className="object-contain" priority />
            </div>
            <div className="overflow-visible">
              <h1 className="text-xl leading-none flex items-center gap-1 uppercase overflow-visible">
                <span className="premium-gold-gradient-heading">MATCH</span> <span className="text-foreground font-black italic tracking-tighter">PULSE</span>
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5 overflow-visible">
                 <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">Live Stream</p>
                 {stats && (
                   <div className="flex items-center gap-1.5 overflow-visible">
                     <span className="h-0.5 w-0.5 rounded-full bg-border" />
                     <span className="premium-gold-gradient-heading text-[8px] uppercase italic">Rank #{stats.rank}</span>
                   </div>
                 )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <ModeToggle />
            <NotificationBell />
          </div>
        </div>
      </header>

      <main className="max-w-md w-full mt-6 px-4">
        <div className="app-glass-card border-primary/10 overflow-visible shadow-2xl flex flex-col">
          <div className="px-5 py-3 bg-muted/30 border-b border-border/40 flex justify-between items-center rounded-t-[2.5rem]">
            <div className="flex items-center gap-2.5">
              <div className="relative h-2 w-2">
                <span className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
                <span className="relative block h-2 w-2 bg-red-500 rounded-full" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-foreground">Terminal Log</span>
            </div>
            <span className="text-[8px] font-black text-muted-foreground uppercase opacity-40 tabular-nums">AUTO-SYNC ACTIVE</span>
          </div>

          <div className="bg-black/[0.02] dark:bg-white/[0.01] min-w-0">
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
              <div className="p-4 sm:p-5 space-y-1 divide-y divide-border/5">
                {logs.map((log) => {
                  // Filter out redundant updates
                  if (log.event_type === 'prediction_updated' && log.metadata?.old_score === log.metadata?.new_score) return null;

                  let displayTitle = log.title;
                  let displayEmoji = log.emoji || '⚽';

                  if (log.event_type === 'prediction_created') {
                    displayTitle = "PICK LOCKED";
                    displayEmoji = "🔥";
                  } else if (log.event_type === 'prediction_updated') {
                    displayTitle = "PICK EDITED";
                    displayEmoji = "✏️";
                  } else if (log.event_type === 'scorer_update') {
                    displayTitle = "SCORERS";
                    displayEmoji = "🥅";
                  } else if (log.event_type === 'score_update') {
                    displayTitle = "SCORE";
                    displayEmoji = "📊";
                  }

                  const formattedMsg = cleanMessage(log.message, log.event_type);

                  return (
                    <div key={log.id} className="flex gap-3.5 py-4 first:pt-2 last:pb-2 group min-w-0 transition-all">
                      <span className="shrink-0 text-xl grayscale-[0.3] group-hover:grayscale-0 transition-all select-none">
                        {displayEmoji}
                      </span>
                      
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <div className="flex items-center gap-2 overflow-visible">
                          <span className="font-mono text-[9px] text-muted-foreground/50 tabular-nums shrink-0">
                            {hasMounted ? DateTime.fromISO(log.created_at).toLocal().toFormat('HH:mm') : '--:--'}
                          </span>
                          <span className="premium-gold-gradient-heading text-[10px] uppercase tracking-wider italic shrink-0">
                            {displayTitle}
                          </span>
                        </div>
                        
                        <p className="text-[13px] font-medium text-muted-foreground leading-snug break-words whitespace-normal">
                          {formattedMsg}
                        </p>
                      </div>

                      <div className="shrink-0 pt-1 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
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
