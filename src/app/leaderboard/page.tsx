
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MainNav } from "@/components/layout/main-nav"
import { Medal, Loader2, Trophy, ArrowUp, ArrowDown, Minus, Crown } from "lucide-react"
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
      // Step 1: Fetch core ranking data
      const { data: lbData, error: lbError } = await supabase
        .from("leaderboard")
        .select(`user_id, display_name, total_points, total_predictions`)
        .order("total_points", { ascending: false })
        .order("total_predictions", { ascending: false })
      
      if (lbError) throw lbError

      if (lbData && lbData.length > 0) {
        const userIds = lbData.map(d => d.user_id)
        
        // Step 2: Fetch profile details (flags) safely using '*' to avoid 'column does not exist' errors
        const { data: profData, error: profError } = await supabase
          .from("profiles")
          .select("*")
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
            // Simulated movement: based on pick count hash for visual flair
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

  const podium = entries.slice(0, 3)
  const remaining = entries.slice(3)

  return (
    <div className="min-h-screen bg-gray-50 text-foreground pb-32">
      <MainNav />
      <header className="px-6 py-4 bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-between h-14">
          <div>
            <h1 className="text-xl font-black italic tracking-tighter uppercase text-gray-900 leading-none">THE ARENA</h1>
            <p className="text-[8px] uppercase font-black text-gray-400 mt-1 tracking-[0.2em]">Global Rankings • Live</p>
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
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em]">Syncing Rankings...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-20 text-center text-gray-300 font-bold uppercase text-[10px] tracking-widest">
            The whistle hasn't blown yet.
          </div>
        ) : (
          <div className="space-y-12">
            {/* Podium Section */}
            <div className="flex items-end justify-center gap-2 sm:gap-6 pt-10 mb-12">
              {/* 2nd Place */}
              {podium[1] && (
                <div className="flex flex-col items-center">
                  <div className="relative mb-3">
                    <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-4 border-white shadow-xl">
                      <AvatarImage src={getTeamFlagUrl(podium[1].favorite_team) || ''} className="object-cover" />
                      <AvatarFallback className="bg-gray-100 text-gray-500 font-black text-sm">{getInitials(podium[1].display_name)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 -right-2 bg-gray-300 text-white rounded-full p-1.5 shadow-lg">
                      <Medal className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="bg-white px-4 py-2 rounded-t-2xl shadow-lg border-x border-t border-gray-100 w-24 sm:w-32 text-center h-20 flex flex-col justify-center">
                    <span className="text-[10px] font-black uppercase text-gray-900 truncate mb-1">{podium[1].display_name}</span>
                    <span className="text-lg font-black italic text-gray-400">#2</span>
                  </div>
                </div>
              )}

              {/* 1st Place */}
              {podium[0] && (
                <div className="flex flex-col items-center">
                  <div className="relative mb-4">
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                       <Crown className="h-8 w-8 text-yellow-500 fill-yellow-500 animate-bounce" />
                    </div>
                    <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-[6px] border-yellow-400 shadow-[0_20px_50px_rgba(234,179,8,0.3)]">
                      <AvatarImage src={getTeamFlagUrl(podium[0].favorite_team) || ''} className="object-cover" />
                      <AvatarFallback className="bg-yellow-50 text-yellow-600 font-black text-xl">{getInitials(podium[0].display_name)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-white rounded-full p-2 shadow-lg">
                      <Trophy className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="bg-white px-4 py-2 rounded-t-3xl shadow-2xl border-x border-t border-gray-100 w-32 sm:w-40 text-center h-28 flex flex-col justify-center ring-4 ring-yellow-400/10">
                    <span className="text-xs font-black uppercase text-gray-900 truncate mb-1">{podium[0].display_name}</span>
                    <span className="text-3xl font-black italic text-yellow-500 leading-none">#1</span>
                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest mt-2">{podium[0].total_points} PTS</span>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {podium[2] && (
                <div className="flex flex-col items-center">
                  <div className="relative mb-3">
                    <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-4 border-white shadow-xl">
                      <AvatarImage src={getTeamFlagUrl(podium[2].favorite_team) || ''} className="object-cover" />
                      <AvatarFallback className="bg-orange-50 text-orange-600 font-black text-sm">{getInitials(podium[2].display_name)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 -right-2 bg-orange-400 text-white rounded-full p-1.5 shadow-lg">
                      <Medal className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="bg-white px-4 py-2 rounded-t-2xl shadow-lg border-x border-t border-gray-100 w-24 sm:w-32 text-center h-16 flex flex-col justify-center">
                    <span className="text-[10px] font-black uppercase text-gray-900 truncate mb-1">{podium[2].display_name}</span>
                    <span className="text-lg font-black italic text-orange-500">#3</span>
                  </div>
                </div>
              )}
            </div>

            {/* List Section */}
            <div className="space-y-3">
              {remaining.map((entry, i) => {
                const rank = i + 4
                const movement = entry.movement
                const flagUrl = getTeamFlagUrl(entry.favorite_team)

                return (
                  <div 
                    key={entry.user_id} 
                    className="flex items-center gap-4 p-5 bg-white rounded-[2.5rem] border border-gray-100 shadow-xl transition-all hover:scale-[1.01] hover:shadow-2xl"
                  >
                    <div className="w-8 flex flex-col items-center justify-center">
                      <span className="text-sm font-black text-gray-400">#{rank}</span>
                    </div>
                    
                    <Avatar className="h-12 w-12 border-2 border-white shadow-md">
                      {flagUrl ? (
                        <AvatarImage src={flagUrl} className="object-cover" />
                      ) : (
                        <AvatarFallback className="bg-primary/5 text-primary font-black text-xs">
                          {getInitials(entry.display_name)}
                        </AvatarFallback>
                      )}
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <span className="font-black text-[13px] uppercase tracking-tight text-gray-900 truncate block">
                        {entry.display_name}
                      </span>
                      <div className="mt-0.5 flex items-center gap-2">
                         <div className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/5">
                            <Trophy className="h-2 w-2 text-primary fill-primary" />
                            <span className="text-[10px] font-black italic text-primary">{entry.total_points}</span>
                         </div>
                         <span className="text-[8px] font-black text-gray-300 uppercase">{entry.total_predictions} PICKS</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center min-w-[20px]">
                        {movement > 0 ? (
                          <>
                            <ArrowUp className="h-4 w-4 text-green-500 fill-green-500" />
                            <span className="text-[8px] font-black text-green-500">+{movement}</span>
                          </>
                        ) : movement < 0 ? (
                          <>
                            <ArrowDown className="h-4 w-4 text-red-500 fill-red-500" />
                            <span className="text-[8px] font-black text-red-500">{movement}</span>
                          </>
                        ) : (
                          <Minus className="h-3 w-3 text-gray-200 stroke-[3px]" />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
