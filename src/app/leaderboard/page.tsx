"use client"

import { MOCK_USERS } from "@/lib/mock-data"
import { MainNav } from "@/components/layout/main-nav"
import { Trophy } from "lucide-react"

export default function Leaderboard() {
  const sortedUsers = [...MOCK_USERS].sort((a, b) => b.points - a.points)

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <MainNav />
      <header className="p-6 bg-gradient-to-b from-accent/10 to-transparent">
        <h1 className="text-3xl font-black italic tracking-tighter">GLOBAL RANKING</h1>
      </header>

      <main className="px-4 max-w-2xl mx-auto">
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          {sortedUsers.map((u, i) => (
            <div 
              key={u.id} 
              className={`flex items-center justify-between p-4 border-b border-white/5 last:border-0 ${i === 0 ? 'bg-secondary/10' : ''}`}
            >
              <div className="flex items-center gap-4">
                <span className={`text-sm font-black w-6 ${i === 0 ? 'text-secondary' : i === 1 ? 'text-accent' : 'text-gray-500'}`}>
                  {i + 1}
                </span>
                <div className="flex flex-col">
                  <span className="font-bold text-sm uppercase tracking-tight">{u.displayName}</span>
                  <span className="text-[10px] text-gray-500 uppercase">{u.predictionsCount} predictions</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black italic">{u.points}</span>
                <span className="text-[8px] uppercase font-black text-secondary">PTS</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
