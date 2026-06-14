"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit2, Check, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { DateTime } from "luxon"
import Image from "next/image"

interface FixtureCardProps {
  fixture: any
  initialHome?: number
  initialAway?: number
  onSave: (id: string, h: number, a: number) => void
}

export function FixtureCard({ fixture, initialHome, initialAway, onSave }: FixtureCardProps) {
  const [hScore, setHScore] = useState<string>(initialHome?.toString() || "")
  const [aScore, setAScore] = useState<string>(initialAway?.toString() || "")
  const [editing, setEditing] = useState(false)
  const [isLocked, setIsLocked] = useState(false)

  // Format kickoff time
  const kickoff = DateTime.fromISO(fixture.kickoff_at)
  const timeStr = kickoff.isValid ? kickoff.toFormat('HH:mm') : 'TBD'
  const dateStr = kickoff.isValid ? kickoff.toFormat('MMM dd') : ''

  useEffect(() => {
    const checkLock = () => {
      const now = DateTime.now()
      const lockTime = kickoff.plus({ minutes: 15 })
      const locked = now > lockTime || fixture.status === 'finished'
      setIsLocked(locked)
    }

    checkLock()
    const interval = setInterval(checkLock, 30000) // Check every 30s
    return () => clearInterval(interval)
  }, [fixture.kickoff_at, fixture.status])

  const handleSave = () => {
    if (isLocked) return
    const h = parseInt(hScore)
    const a = parseInt(aScore)
    if (!isNaN(h) && !isNaN(a)) {
      onSave(fixture.id, h, a)
      setEditing(false)
    }
  }

  const isLive = fixture.status === 'live'
  
  return (
    <Card className="relative overflow-hidden border border-gray-100 bg-white rounded-[2.5rem] shadow-sm hover:shadow-md transition-all duration-300 group">
      <CardContent className="p-8 relative z-10">
        <div className="flex items-center justify-between gap-4">
          {/* Home Team */}
          <div className="flex flex-col items-center flex-1 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center overflow-hidden mb-3 border border-gray-100 shadow-sm transition-transform group-hover:scale-105">
              {fixture.home_flag ? (
                <Image 
                  src={fixture.home_flag} 
                  alt={fixture.home_team} 
                  width={64} 
                  height={64} 
                  className="object-cover w-full h-full"
                />
              ) : (
                <span className="text-3xl">⚽</span>
              )}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-900 leading-tight mb-1">{fixture.home_team}</span>
            <span className="text-[9px] font-bold text-gray-400 uppercase">{fixture.home_team.substring(0, 3).toUpperCase()}</span>
          </div>

          {/* Center Area (Score/Status) */}
          <div className="flex flex-col items-center justify-center min-w-[120px]">
            {isLive ? (
              <div className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1 rounded-full text-[9px] font-black uppercase mb-4 animate-pulse">
                <span className="h-1.5 w-1.5 bg-red-600 rounded-full" /> Live
              </div>
            ) : isLocked ? (
              <div className="flex items-center gap-1 bg-gray-100 text-gray-400 px-3 py-1 rounded-full text-[9px] font-black uppercase mb-4">
                <Lock className="h-2 w-2" /> {fixture.status === 'finished' ? 'Finished' : 'Locked'}
              </div>
            ) : (
              <div className="text-[9px] font-black text-primary uppercase mb-4 tracking-widest">
                {dateStr} • {timeStr}
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
                {fixture.status === 'finished' && (
                  <div className="mt-2 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                    Final Result: {fixture.home_score} - {fixture.away_score}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6">
               {!isLocked && (
                  editing ? (
                    <Button size="sm" onClick={handleSave} className="rounded-full bg-primary hover:bg-primary/90 px-6 h-9 font-black uppercase text-[10px] tracking-wider">
                      <Check className="h-4 w-4 mr-1" /> Save Pick
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" onClick={() => setEditing(true)} className="rounded-full bg-gray-50 border border-gray-100 h-10 w-10 hover:bg-gray-100 transition-colors">
                      <Edit2 className="h-4 w-4 text-gray-400" />
                    </Button>
                  )
               )}
            </div>
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center flex-1 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center overflow-hidden mb-3 border border-gray-100 shadow-sm transition-transform group-hover:scale-105">
              {fixture.away_flag ? (
                <Image 
                  src={fixture.away_flag} 
                  alt={fixture.away_team} 
                  width={64} 
                  height={64} 
                  className="object-cover w-full h-full"
                />
              ) : (
                <span className="text-3xl">⚽</span>
              )}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-900 leading-tight mb-1">{fixture.away_team}</span>
            <span className="text-[9px] font-bold text-gray-400 uppercase">{fixture.away_team.substring(0, 3).toUpperCase()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
