"use client"

import { useState, useEffect } from "react"
import { Fixture } from "@/lib/mock-data"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Camera, Edit2, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface FixtureCardProps {
  fixture: Fixture
  initialHome?: number
  initialAway?: number
  onSave: (id: string, h: number, a: number) => void
}

export function FixtureCard({ fixture, initialHome, initialAway, onSave }: FixtureCardProps) {
  const [hScore, setHScore] = useState<string>(initialHome?.toString() || "")
  const [aScore, setAScore] = useState<string>(initialAway?.toString() || "")
  const [editing, setEditing] = useState(false)

  const handleSave = () => {
    const h = parseInt(hScore)
    const a = parseInt(aScore)
    if (!isNaN(h) && !isNaN(a)) {
      onSave(fixture.id, h, a)
      setEditing(false)
    }
  }

  const isLive = fixture.status === 'live' || (fixture.status === 'scheduled' && fixture.id === '1') // Mocking live status for visual

  return (
    <Card className="relative overflow-hidden border-none glass-card rounded-[2.5rem] transition-all duration-500 group">
      {/* Team Specific Background Glow */}
      <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-primary/40 to-transparent group-hover:opacity-40 transition-opacity pointer-events-none" />
      
      <CardContent className="p-8 relative z-10">
        <div className="flex items-center justify-between gap-4">
          {/* Home Team */}
          <div className="flex flex-col items-center flex-1 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-4xl mb-3 shadow-lg border border-white/5">
              {fixture.homeTeam.flag}
            </div>
            <span className="text-xs font-bold uppercase tracking-wide opacity-80">{fixture.homeTeam.name}</span>
            <span className="text-[10px] font-bold text-gray-500 mt-1 uppercase">{fixture.homeTeam.code}</span>
          </div>

          {/* Center Area (Score/Status) */}
          <div className="flex flex-col items-center justify-center min-w-[100px]">
            {isLive && (
              <div className="flex items-center gap-1 bg-red-500/10 text-red-500 px-3 py-1 rounded-full text-[10px] font-black uppercase mb-4 animate-pulse">
                <Camera className="h-3 w-3" /> Live
              </div>
            )}
            
            {editing ? (
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={hScore} 
                  onChange={(e) => setHScore(e.target.value)}
                  className="w-12 h-12 text-center text-2xl font-bold bg-white/10 border-none rounded-2xl focus:ring-2 focus:ring-primary/50 outline-none"
                  autoFocus
                />
                <span className="text-2xl font-bold text-gray-500">:</span>
                <input 
                  type="number" 
                  value={aScore} 
                  onChange={(e) => setAScore(e.target.value)}
                  className="w-12 h-12 text-center text-2xl font-bold bg-white/10 border-none rounded-2xl focus:ring-2 focus:ring-primary/50 outline-none"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-4">
                  <span className={cn("text-4xl font-black", initialHome === undefined ? "text-white/20" : "text-white")}>
                    {initialHome ?? '0'}
                  </span>
                  <span className="text-2xl font-black text-white/40">:</span>
                  <span className={cn("text-4xl font-black", initialAway === undefined ? "text-white/20" : "text-white")}>
                    {initialAway ?? '0'}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-gray-500 mt-2 uppercase tracking-[0.2em]">40:32</span>
              </div>
            )}

            <div className="mt-6">
               {editing ? (
                  <Button size="icon" onClick={handleSave} className="rounded-full bg-primary h-10 w-10">
                    <Check className="h-5 w-5" />
                  </Button>
               ) : (
                  <Button variant="ghost" size="icon" onClick={() => setEditing(true)} className="rounded-full bg-white/5 border border-white/10 h-10 w-10 hover:bg-white/10">
                    <Edit2 className="h-4 w-4" />
                  </Button>
               )}
            </div>
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center flex-1 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-4xl mb-3 shadow-lg border border-white/5">
              {fixture.awayTeam.flag}
            </div>
            <span className="text-xs font-bold uppercase tracking-wide opacity-80">{fixture.awayTeam.name}</span>
            <span className="text-[10px] font-bold text-gray-500 mt-1 uppercase">{fixture.awayTeam.code}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}