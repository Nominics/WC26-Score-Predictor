"use client"

import { useState } from "react"
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

  const isLive = fixture.status === 'live' || (fixture.status === 'scheduled' && fixture.id === '1')

  return (
    <Card className="relative overflow-hidden border border-gray-100 bg-white rounded-[2.5rem] shadow-sm hover:shadow-md transition-all duration-300 group">
      <CardContent className="p-8 relative z-10">
        <div className="flex items-center justify-between gap-4">
          {/* Home Team */}
          <div className="flex flex-col items-center flex-1 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center text-4xl mb-3 border border-gray-100 shadow-sm transition-transform group-hover:scale-105">
              {fixture.homeTeam.flag}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-900 leading-tight mb-1">{fixture.homeTeam.name}</span>
            <span className="text-[9px] font-bold text-gray-400 uppercase">{fixture.homeTeam.code}</span>
          </div>

          {/* Center Area (Score/Status) */}
          <div className="flex flex-col items-center justify-center min-w-[120px]">
            {isLive && (
              <div className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1 rounded-full text-[9px] font-black uppercase mb-4 animate-pulse">
                <span className="h-1.5 w-1.5 bg-red-600 rounded-full" /> Live
              </div>
            )}
            
            {editing ? (
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={hScore} 
                  onChange={(e) => setHScore(e.target.value)}
                  className="w-14 h-14 text-center text-2xl font-black bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none"
                  autoFocus
                />
                <span className="text-2xl font-black text-gray-300">:</span>
                <input 
                  type="number" 
                  value={aScore} 
                  onChange={(e) => setAScore(e.target.value)}
                  className="w-14 h-14 text-center text-2xl font-black bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-4">
                  <span className={cn("text-4xl font-black italic tracking-tighter", initialHome === undefined ? "text-gray-200" : "text-gray-900")}>
                    {initialHome ?? '0'}
                  </span>
                  <span className="text-2xl font-black text-gray-100 italic">:</span>
                  <span className={cn("text-4xl font-black italic tracking-tighter", initialAway === undefined ? "text-gray-200" : "text-gray-900")}>
                    {initialAway ?? '0'}
                  </span>
                </div>
                <span className="text-[9px] font-black text-gray-300 mt-2 uppercase tracking-[0.2em] italic">Kickoff in 2h</span>
              </div>
            )}

            <div className="mt-6">
               {editing ? (
                  <Button size="sm" onClick={handleSave} className="rounded-full bg-primary hover:bg-primary/90 px-6 h-9 font-black uppercase text-[10px] tracking-wider">
                    <Check className="h-4 w-4 mr-1" /> Save Pick
                  </Button>
               ) : (
                  <Button variant="ghost" size="icon" onClick={() => setEditing(true)} className="rounded-full bg-gray-50 border border-gray-100 h-10 w-10 hover:bg-gray-100 transition-colors">
                    <Edit2 className="h-4 w-4 text-gray-400" />
                  </Button>
               )}
            </div>
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center flex-1 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center text-4xl mb-3 border border-gray-100 shadow-sm transition-transform group-hover:scale-105">
              {fixture.awayTeam.flag}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-900 leading-tight mb-1">{fixture.awayTeam.name}</span>
            <span className="text-[9px] font-bold text-gray-400 uppercase">{fixture.awayTeam.code}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}