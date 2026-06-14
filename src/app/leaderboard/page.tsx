
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MainNav } from "@/components/layout/main-nav"
import { Trophy, Medal, Star } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function Leaderboard() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      // In a real app, points would be calculated in the DB or a view
      // For MVP, we'll just fetch profiles. You can add a 'points' column to profiles later.
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("id", { ascending: true }) // Placeholder ordering
      
      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error("Leaderboard fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-foreground pb-24 md:pt-20">
      <MainNav />
      <header className="p-6 bg-primary text-white">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter">GLOBAL RANKING</h1>
            <p className="text-[10px] uppercase font-bold opacity-80 mt-1">Season 2026 · Live Updates</p>
          </div>
          <Trophy className="h-10 w-10 text-white/20" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto -mt-6 px-4">
        <div className="bg-white shadow-xl shadow-primary/10 rounded-3xl overflow-hidden border border-gray-50">
          {loading ? (
             <div className="p-12 text-center text-gray-400 font-bold uppercase text-xs animate-pulse">
                Fetching Rankings...
             </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-gray-400 font-bold uppercase text-xs">
                No players in the arena yet.
            </div>
          ) : (
            users.map((u, i) => (
              <div 
                key={u.id} 
                className={`flex items-center justify-between p-5 border-b border-gray-50 last:border-0 transition-colors hover:bg-gray-50/50 ${i === 0 ? 'bg-secondary/5' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className="relative w-8 text-center">
                    {i === 0 ? (
                      <Medal className="h-6 w-6 text-yellow-500 mx-auto" />
                    ) : i === 1 ? (
                      <Medal className="h-6 w-6 text-gray-400 mx-auto" />
                    ) : i === 2 ? (
                      <Medal className="h-6 w-6 text-orange-400 mx-auto" />
                    ) : (
                      <span className="text-sm font-black text-gray-300">#{i + 1}</span>
                    )}
                  </div>
                  
                  <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                    <AvatarFallback className="bg-primary/5 text-primary font-black text-xs">
                      {u.display_name?.substring(0, 2).toUpperCase() || '??'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex flex-col">
                    <span className="font-black text-sm uppercase tracking-tight text-gray-800">{u.display_name || 'Anonymous Player'}</span>
                    <div className="flex items-center gap-1 text-[9px] text-gray-400 font-bold uppercase">
                      <Star className="h-2 w-2 fill-gray-400" />
                      Season Active
                    </div>
                  </div>
                </div>
                
                <div className="text-right flex flex-col items-end">
                  <span className="text-2xl font-black italic text-primary leading-none">{u.points || 0}</span>
                  <span className="text-[8px] uppercase font-black text-gray-400">Points</span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
