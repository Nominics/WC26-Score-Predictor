
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MainNav } from "@/components/layout/main-nav"
import { Medal, Loader2, Trophy, ArrowUp, ArrowDown, Minus } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ProfileSheet } from "@/components/profile/profile-sheet"
import { PwaInstallButton } from "@/components/pwa-install-button"
import { getTeamFlagUrl } from "@/lib/team-flags"
import { cn } from "@/lib/utils"

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
        .select(`
          user_id,
          display_name,
          total_points,
          total_predictions,
          rank,
          favorite_team
        `)
        .order("total_points", { ascending: false })
        .order("total_predictions", { ascending: false })
      
      if (error) {
        console.error("Leaderboard fetch error details:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        throw error
      }

      const processedEntries = (data || []).map((entry, idx) => ({
        ...entry,
        // Using total_predictions % 3 to simulate a movement for visual variety
        movement: (entry.total_predictions % 3) - 1 
      }))
      setEntries(processedEntries)
    } catch (err: any) {
      console.error("Leaderboard fetch error caught:", err.message || err)
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
      <header className="px-6 py-4 bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-between h-14">
          <div>
            <h1 className="text-xl font-black italic tracking-tighter uppercase">LEADERBOARD</h1>
            <p className="text-[10px] uppercase font-black text-gray-400 mt-0.5 tracking-widest">Season 2026 • LIVE</p>
          </div>
          <div className="flex items-center gap-2">
            <PwaInstallButton />
            <ProfileSheet />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto mt-6 px-4 space-y-3">
        {loading ? (
          <div className="p-20 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-[10px] font-black uppercase text-gray-300 tracking-[0.2em]">Syncing Rankings...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-20 text-center text-gray-300 font-bold uppercase text-[10px]">
            No activity detected in the arena.
          </div>
        ) : (
          entries.map((entry, i) => {
            const rank = i + 1;
            const flagUrl = getTeamFlagUrl(entry.favorite_team);
            const movement = entry.movement;

            return (
              <div 
                key={entry.user_id} 
                className={cn(
                  "flex items-center gap-5 p-5 bg-white rounded-[2.5rem] border border-gray-100 shadow-xl transition-all hover:scale-[1.01]",
                  rank <= 3 && "ring-2 ring-primary/5"
                )}
              >
                <div className="w-10 flex flex-col items-center justify-center">
                  {rank === 1 ? <Medal className="h-7 w-7 text-yellow-500 drop-shadow-md" /> : 
                   rank === 2 ? <Medal className="h-7 w-7 text-gray-400 drop-shadow-md" /> :
                   rank === 3 ? <Medal className="h-7 w-7 text-orange-400 drop-shadow-md" /> :
                   <span className="text-lg font-black text-gray-900">#{rank}</span>}
                </div>
                
                <Avatar className="h-14 w-14 border-4 border-white shadow-xl">
                  {flagUrl ? (
                    <AvatarImage src={flagUrl} className="object-cover" />
                  ) : (
                    <AvatarFallback className="bg-primary/5 text-primary font-black text-sm">
                      {getInitials(entry.display_name)}
                    </AvatarFallback>
                  )}
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col">
                    <span className="font-black text-sm uppercase tracking-tight text-gray-900 truncate">
                      {entry.display_name}
                    </span>
                    <div className="mt-1 flex items-center gap-2">
                       <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full border border-primary/5 shadow-inner">
                          <Trophy className="h-3 w-3 text-primary fill-primary" />
                          <span className="text-[11px] font-black italic text-primary">{entry.total_points}</span>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center w-8">
                  {movement > 0 ? (
                    <ArrowUp className="h-5 w-5 text-green-500 fill-green-500 drop-shadow-sm" />
                  ) : movement < 0 ? (
                    <ArrowDown className="h-5 w-5 text-red-500 fill-red-500 drop-shadow-sm" />
                  ) : (
                    <Minus className="h-4 w-4 text-gray-200 stroke-[3px]" />
                  )}
                </div>
              </div>
            )
          })
        )}
      </main>
    </div>
  )
}
