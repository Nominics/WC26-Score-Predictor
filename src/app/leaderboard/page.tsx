
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MainNav } from "@/components/layout/main-nav"
import { Medal, Loader2, Trophy, ArrowUp, ArrowDown, Minus, Hash } from "lucide-react"
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
      // Step 1: Fetch core ranking data from leaderboard view
      const { data: lbData, error: lbError } = await supabase
        .from("leaderboard")
        .select(`user_id, display_name, total_points, total_predictions`)
        .order("total_points", { ascending: false })
        .order("total_predictions", { ascending: false })
      
      if (lbError) throw lbError

      if (lbData && lbData.length > 0) {
        const userIds = lbData.map(d => d.user_id)
        
        // Step 2: Fetch profile details (flags) safely
        const { data: profData, error: profError } = await supabase
          .from("profiles")
          .select("id, favorite_team")
          .in("id", userIds)

        if (profError) {
          console.warn("Profile fetch warning (might be missing columns):", profError)
        }

        // Step 3: Merge and calculate simulated movement
        const processedEntries = lbData.map((entry: any) => {
          const profile = profData?.find(p => p.id === entry.user_id)
          return {
            ...entry,
            favorite_team: profile?.favorite_team,
            // Simulated movement based on total predictions for visual flair
            movement: (entry.total_predictions % 3) - 1 
          }
        })
        setEntries(processedEntries)
      } else {
        setEntries([])
      }
    } catch (err: any) {
      console.error("Leaderboard fetch error caught:", err.message || err)
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return "??"
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  return (
    <div className="min-h-screen bg-gray-50 text-foreground pb-32">
      <MainNav />
      <header className="px-6 py-4 bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-between h-14">
          <div>
            <h1 className="text-xl font-black italic tracking-tighter uppercase text-gray-900 leading-none">THE ARENA</h1>
            <p className="text-[8px] uppercase font-black text-gray-400 mt-1 tracking-[0.2em]">Live Global Rankings</p>
          </div>
          <div className="flex items-center gap-2">
            <PwaInstallButton />
            <ProfileSheet />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto mt-8 px-4">
        {loading ? (
          <div className="p-20 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em]">Syncing Arena...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-20 text-center text-gray-300 font-bold uppercase text-[10px] tracking-widest bg-white rounded-[2.5rem] border-2 border-dashed">
            The whistle hasn't blown yet.
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, i) => {
              const rank = i + 1
              const movement = entry.movement
              const flagUrl = getTeamFlagUrl(entry.favorite_team)
              const isTopThree = rank <= 3

              return (
                <div 
                  key={entry.user_id} 
                  className={cn(
                    "flex items-center gap-4 p-5 bg-white rounded-[2.5rem] border transition-all hover:scale-[1.01] hover:shadow-2xl relative overflow-hidden",
                    isTopThree ? "border-primary/20 shadow-xl" : "border-gray-100 shadow-lg"
                  )}
                >
                  {/* Rank Indicator */}
                  <div className="w-10 flex flex-col items-center justify-center">
                    {rank === 1 ? (
                      <Medal className="h-6 w-6 text-yellow-500 fill-yellow-500" />
                    ) : rank === 2 ? (
                      <Medal className="h-6 w-6 text-gray-400 fill-gray-400" />
                    ) : rank === 3 ? (
                      <Medal className="h-6 w-6 text-orange-400 fill-orange-400" />
                    ) : (
                      <span className="text-sm font-black text-gray-400">#{rank}</span>
                    )}
                  </div>
                  
                  {/* Profile / Flag */}
                  <Avatar className={cn(
                    "h-12 w-12 border-2 shadow-md",
                    isTopThree ? "border-primary/20" : "border-white"
                  )}>
                    {flagUrl ? (
                      <AvatarImage src={flagUrl} className="object-cover" />
                    ) : (
                      <AvatarFallback className="bg-primary/5 text-primary font-black text-xs">
                        {getInitials(entry.display_name)}
                      </AvatarFallback>
                    )}
                  </Avatar>

                  {/* Player Info */}
                  <div className="flex-1 min-w-0">
                    <span className="font-black text-[13px] uppercase tracking-tight text-gray-900 truncate block">
                      {entry.display_name}
                    </span>
                    <div className="mt-1 flex items-center gap-3">
                       <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                          <Hash className="h-2.5 w-2.5 text-gray-400" />
                          <span className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">
                            {entry.total_predictions} <span className="text-gray-300">Picks</span>
                          </span>
                       </div>
                    </div>
                  </div>

                  {/* Points and Movement */}
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center min-w-[32px]">
                        {movement > 0 ? (
                          <div className="flex flex-col items-center">
                            <ArrowUp className="h-4 w-4 text-green-500 fill-green-500" />
                            <span className="text-[8px] font-black text-green-500">+{movement}</span>
                          </div>
                        ) : movement < 0 ? (
                          <div className="flex flex-col items-center">
                            <ArrowDown className="h-4 w-4 text-red-500 fill-red-500" />
                            <span className="text-[8px] font-black text-red-500">{movement}</span>
                          </div>
                        ) : (
                          <Minus className="h-3 w-3 text-gray-200 stroke-[3px]" />
                        )}
                    </div>
                    
                    <div className="flex flex-col items-end min-w-[60px]">
                       <div className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-2xl shadow-lg shadow-primary/20">
                          <Trophy className="h-3 w-3 fill-white/20" />
                          <span className="text-sm font-black italic">{entry.total_points}</span>
                       </div>
                       <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest mt-1 mr-1">Points</span>
                    </div>
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
