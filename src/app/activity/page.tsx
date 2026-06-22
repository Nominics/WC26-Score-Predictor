
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MainNav } from "@/components/layout/main-nav"
import { Zap, MessageSquare, Loader2, Star, TrendingUp, TrendingDown, Clock, ShieldCheck } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DateTime } from "luxon"
import { ProfileSheet } from "@/components/profile/profile-sheet"
import { PwaInstallButton } from "@/components/pwa-install-button"
import { useAuth } from "@/hooks/use-auth"
import { getTeamFlagUrl } from "@/lib/team-flags"
import { cn } from "@/lib/utils"
import Image from "next/image"

export default function Activity() {
  const { stats } = useAuth()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
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
        .limit(30)
      
      if (error) throw error
      setLogs(data || [])
    } catch (err) {
      console.error("Activity fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return "??"
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  return (
    <div className="min-h-screen bg-gray-50 text-foreground pb-24">
      <MainNav />
      <header className="px-6 py-4 border-b border-gray-100 bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex justify-between items-center h-14">
          <div>
            <h1 className="text-xl font-black italic tracking-tighter flex items-center gap-2 uppercase text-gray-900 leading-none">
              <div className="relative h-6 w-6 shrink-0">
                <Image src="/logo.png" alt="Arena Logo" fill className="object-contain" />
              </div>
              LIVE <span className="text-primary">FEED</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
               <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest">Match Pulse</p>
               {stats && (
                 <div className="flex items-center gap-1.5">
                   <span className="h-0.5 w-0.5 rounded-full bg-gray-200" />
                   <span className="text-[9px] font-black text-primary uppercase italic">Rank #{stats.rank}</span>
                   <span className="text-[9px] font-black text-gray-900 uppercase">({stats.points} pts)</span>
                   <span className="h-0.5 w-0.5 rounded-full bg-gray-200" />
                   <div className="flex items-center gap-1 bg-yellow-50 px-1.5 py-0.5 rounded-full border border-yellow-100">
                      <Zap className="h-2 w-2 text-yellow-500 fill-yellow-500" />
                      <span className="text-[8px] font-black text-yellow-600">{stats.lifelines}</span>
                   </div>
                 </div>
               )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PwaInstallButton />
            <ProfileSheet />
          </div>
        </div>
      </header>

      <main className="p-4 space-y-3 max-w-2xl mx-auto mt-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border shadow-xl">
            <p className="text-[10px] font-black uppercase text-gray-400">No activity yet</p>
          </div>
        ) : (
          logs.map((log) => {
            const flagUrl = getTeamFlagUrl(log.favorite_team)
            const isManualAdjustment = log.action === 'manual_points_awarded'
            const isFixtureUpdate = log.action === 'fixture_time_updated'
            
            return (
              <div key={log.id} className="flex gap-4 p-5 bg-white rounded-3xl border border-gray-100 items-center shadow-xl transition-all hover:scale-[1.01]">
                <Avatar className="h-12 w-12 border-2 border-white shadow-md">
                  {flagUrl ? (
                    <AvatarImage src={flagUrl} className="object-cover" />
                  ) : isFixtureUpdate ? (
                    <AvatarFallback className="bg-gray-900 text-primary font-black text-xs">
                      <ShieldCheck className="h-5 w-5" />
                    </AvatarFallback>
                  ) : (
                    <AvatarFallback className="bg-primary/5 text-primary font-black text-xs">
                      {getInitials(log.display_name)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <p className="text-[11px] truncate">
                        <span className="font-black text-gray-900 uppercase mr-1">{log.display_name}</span>
                        <span className="text-gray-400 font-bold lowercase">
                          {isManualAdjustment 
                            ? (log.points_awarded > 0 ? 'received a bonus' : 'received an adjustment')
                            : isFixtureUpdate ? 'updated a match schedule' : (log.action === 'prediction_created' ? 'locked in' : 'updated') + ' a pick'
                          }
                        </span>
                      </p>
                      {isManualAdjustment ? (
                        <div className="flex items-center gap-2 mt-1">
                          <div className={cn(
                            "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black italic uppercase",
                            log.points_awarded > 0 ? "bg-green-50 text-green-600 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"
                          )}>
                             {log.points_awarded > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                             {log.points_awarded > 0 ? '+' : ''}{log.points_awarded} Points
                          </div>
                          <span className="text-[10px] font-bold text-gray-500 italic truncate italic">"{log.reason}"</span>
                        </div>
                      ) : isFixtureUpdate ? (
                        <div className="flex flex-col gap-1 mt-1">
                           <p className="font-black text-gray-900 uppercase italic text-[14px] tracking-tight">
                             {log.home_team} vs {log.away_team}
                           </p>
                           <div className="flex items-center gap-1.5 bg-primary/5 border border-primary/10 rounded-lg px-2 py-1 w-fit">
                              <Clock className="h-3 w-3 text-primary" />
                              <span className="text-[10px] font-black text-primary uppercase">New Time: {DateTime.fromISO(log.new_time).toFormat('LLL dd, HH:mm')}</span>
                           </div>
                        </div>
                      ) : (
                        <p className="font-black text-primary uppercase italic text-[14px] tracking-tight">
                          {log.home_team} vs {log.away_team}
                        </p>
                      )}
                    </div>
                    <span className="text-[9px] text-gray-300 font-black uppercase bg-gray-50 px-2 py-1 rounded-full whitespace-nowrap shadow-inner">
                      {DateTime.fromISO(log.created_at).toRelative()}
                    </span>
                  </div>
                </div>
                {isManualAdjustment ? <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" /> : isFixtureUpdate ? <Clock className="h-3 w-3 text-primary" /> : <MessageSquare className="h-3 w-3 text-gray-100" />}
              </div>
            )
          })
        )}
      </main>
    </div>
  )
}
