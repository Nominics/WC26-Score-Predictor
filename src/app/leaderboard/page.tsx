"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MainNav } from "@/components/layout/main-nav"
import { Trophy, Medal, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ProfileSheet } from "@/components/profile/profile-sheet"

export default function Leaderboard() {
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

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
      const { data, error } = await supabase
        .from("leaderboard")
        .select("*")
        .order("total_points", { ascending: false })
        .order("total_predictions", { ascending: false })
      
      if (error) throw error
      setEntries(data || [])
    } catch (err) {
      console.error("Leaderboard fetch error:", err)
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
      <header className="p-8 bg-primary text-white shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter">LEADERBOARD</h1>
            <p className="text-[10px] uppercase font-bold opacity-80 mt-1">Season 2026 · LIVE</p>
          </div>
          <div className="flex items-center gap-4">
            <Trophy className="h-10 w-10 text-white/20" />
            <ProfileSheet />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto -mt-6 px-4">
        <div className="bg-white shadow-2xl rounded-[2.5rem] overflow-hidden border border-gray-100">
          {loading ? (
             <div className="p-20 flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
                <p className="text-[10px] font-black uppercase text-gray-400">Syncing Rankings...</p>
             </div>
          ) : entries.length === 0 ? (
            <div className="p-20 text-center text-gray-400 font-bold uppercase text-[10px]">
                Arena is currently empty.
            </div>
          ) : (
            entries.map((entry, i) => (
              <div 
                key={entry.user_id} 
                className={`flex items-center justify-between p-6 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-all ${i < 3 ? 'bg-primary/5' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 text-center">
                    {i === 0 ? <Medal className="h-6 w-6 text-yellow-500 mx-auto" /> : 
                     i === 1 ? <Medal className="h-6 w-6 text-gray-400 mx-auto" /> :
                     i === 2 ? <Medal className="h-6 w-6 text-orange-400 mx-auto" /> :
                     <span className="text-sm font-black text-gray-300">#{i + 1}</span>}
                  </div>
                  
                  <Avatar className="h-12 w-12 border-2 border-white shadow-md">
                    <AvatarFallback className="bg-primary/10 text-primary font-black text-xs">
                      {getInitials(entry.display_name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex flex-col">
                    <span className="font-black text-sm uppercase tracking-tight text-gray-900">{entry.display_name}</span>
                    <span className="text-[8px] text-gray-400 font-bold uppercase">{entry.total_predictions} Predictions</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <span className="text-2xl font-black italic text-primary leading-none">{entry.total_points}</span>
                  <p className="text-[8px] uppercase font-black text-gray-300">PTS</p>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
