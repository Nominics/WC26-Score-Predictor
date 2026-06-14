"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MainNav } from "@/components/layout/main-nav"
import { Zap, MessageSquare, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DateTime } from "luxon"
import { ProfileSheet } from "@/components/profile/profile-sheet"

export default function Activity() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchLogs()
    
    const channel = supabase
      .channel('activity-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, () => fetchLogs())
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
      <header className="p-6 border-b border-gray-100 bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-black italic tracking-tighter flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary fill-primary" />
            LIVE FEED
          </h1>
          <ProfileSheet />
        </div>
      </header>

      <main className="p-4 space-y-3 max-w-2xl mx-auto mt-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border shadow-sm">
            <p className="text-[10px] font-black uppercase text-gray-400">No activity yet</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex gap-4 p-5 bg-white rounded-3xl border border-gray-100 items-center shadow-xl transition-all hover:scale-[1.01]">
              <Avatar className="h-12 w-12 border border-gray-50 shadow-sm">
                <AvatarFallback className="bg-gray-50 text-primary font-black text-xs">
                  {getInitials(log.display_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <p className="text-[11px]">
                      <span className="font-black text-gray-900 uppercase mr-1">{log.display_name}</span>
                      <span className="text-gray-400 font-bold lowercase">
                        {log.action === 'prediction_created' ? 'locked in' : 'updated'} a pick
                      </span>
                    </p>
                    <p className="font-black text-primary uppercase italic text-[14px] tracking-tight">
                      {log.home_team} vs {log.away_team}
                    </p>
                  </div>
                  <span className="text-[9px] text-gray-300 font-black uppercase bg-gray-50 px-2 py-1 rounded-full whitespace-nowrap shadow-inner">
                    {DateTime.fromISO(log.created_at).toRelative()}
                  </span>
                </div>
              </div>
              <MessageSquare className="h-3 w-3 text-gray-100" />
            </div>
          ))
        )}
      </main>
    </div>
  )
}
