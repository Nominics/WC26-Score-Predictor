"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit2, Check, Lock, Trophy, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { DateTime } from "luxon"
import Image from "next/image"

interface FixtureCardProps {
  fixture: any
  initialHome?: number
  initialAway?: number
  onSave: (id: string, h: number, a: number, isLifeline: boolean) => void
  lifelinesRemaining?: number
}

export function FixtureCard({ fixture, initialHome, initialAway, onSave, lifelinesRemaining = 0 }: FixtureCardProps) {
  const [hScore, setHScore] = useState<string>(initialHome?.toString() || "")
  const [aScore, setAScore] = useState<string>(initialAway?.toString() || "")
  const [editing, setEditing] = useState(false)
  const [isStandardLocked, setIsStandardLocked] = useState(false)
  const [isLifelineAvailable, setIsLifelineAvailable] = useState(false)
  const [isTotalLocked, setIsTotalLocked] = useState(false)

  const kickoff = DateTime.fromISO(fixture.kickoff_at)
  const timeStr = kickoff.isValid ? kickoff.toFormat('HH:mm') : 'TBD'
  const dateStr = kickoff.isValid ? kickoff.toFormat('MMM dd') : ''

  useEffect(() => {
    const checkLock = () => {
      const now = DateTime.now()
      const standardLock = kickoff.plus({ minutes: 15 })
      const lifelineLock = kickoff.plus({ minutes: 50 })
      
      const finished = fixture.status === 'finished'
      
      setIsStandardLocked(now > standardLock || finished)
      setIsLifelineAvailable(now >= standardLock && now < lifelineLock && !finished && lifelinesRemaining > 0)
      setIsTotalLocked(now > lifelineLock || finished)
    }

    checkLock()
    const interval = setInterval(checkLock, 10000)
    return () => clearInterval(interval)
  }, [fixture.kickoff_at, fixture.status, lifelinesRemaining])

  const handleSave = (isLifeline: boolean) => {
    const h = parseInt(hScore)
    const a = parseInt(aScore)
    if (!isNaN(h) && !isNaN(a)) {
      onSave(fixture.id, h, a, isLifeline)
      setEditing(false)
    }
  }

  const isLive = fixture.status === 'live'
  const isFinished = fixture.status === 'finished'
  
  return (
    <Card className={cn(
      "relative overflow-hidden border-2 rounded-[2.5rem] transition-all duration-300 group shadow-lg hover:shadow-xl",
      isLive ? "border-green-500 bg-white" : 
      isFinished ? "border-orange-400 bg-white" : 
      "border-gray-100 bg-white"
    )}>
      {isLive && <div className="absolute top-0 left-0 w-full h-1 bg-green-500 animate-pulse" />}
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center justify-between gap-2">
          {/* Home Team */}
          <div className="flex flex-col items-center flex-1 text-center min-w-0">
            <div className="mb-2">
              {fixture.home_flag ? (
                <div className="relative h-12 w-12 sm:h-16 sm:w-16">
                  <Image 
                    src={fixture.home_flag} 
                    alt={`${fixture.home_team} flag`} 
                    fill
                    className="rounded-full object-cover ring-4 ring-gray-50 shadow-md"
                  />
                </div>
              ) : (
                <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-gray-50 border-2 border-dashed border-gray-200 text-[10px] font-black text-gray-400 uppercase italic">
                  TBD
                </div>
              )}
            </div>
            <span className="text-[11px] font-black uppercase tracking-tight text-gray-900 truncate w-full px-1">{fixture.home_team}</span>
          </div>

          {/* Center Area (Score/Status) */}
          <div className="flex flex-col items-center justify-center min-w-[140px]">
            {isLive ? (
              <div className="flex items-center gap-1.5 bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase mb-3 animate-pulse shadow-md">
                <span className="h-1.5 w-1.5 bg-white rounded-full" /> Live
              </div>
            ) : isFinished ? (
              <div className="flex items-center gap-1.5 bg-orange-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase mb-3 shadow-md">
                <Trophy className="h-3 w-3" /> Result
              </div>
            ) : isStandardLocked ? (
              <div className="flex items-center gap-1 bg-gray-100 text-gray-400 px-3 py-1 rounded-full text-[9px] font-black uppercase mb-3">
                <Lock className="h-2 w-2" /> Locked
              </div>
            ) : (
              <div className="text-[10px] font-black text-primary uppercase mb-3 tracking-widest bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
                {timeStr} • {dateStr}
              </div>
            )}
            
            {editing ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    value={hScore} 
                    onChange={(e) => setHScore(e.target.value)}
                    className="w-12 h-12 text-center text-xl font-black bg-gray-50 border-2 border-primary/20 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                    autoFocus
                  />
                  <span className="text-xl font-black text-gray-300">:</span>
                  <input 
                    type="number" 
                    value={aScore} 
                    onChange={(e) => setAScore(e.target.value)}
                    className="w-12 h-12 text-center text-xl font-black bg-gray-50 border-2 border-primary/20 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                  />
                </div>
                <Button size="sm" onClick={() => handleSave(isStandardLocked)} className="rounded-full bg-primary hover:bg-primary/90 px-6 h-9 font-black uppercase text-[10px] tracking-wider shadow-lg">
                  <Check className="h-4 w-4 mr-1" /> {isStandardLocked ? 'Use Lifeline' : 'Lock Pick'}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-4 bg-gray-50/50 backdrop-blur-sm px-5 py-2 rounded-2xl border border-gray-100/50 shadow-inner">
                  <span className={cn(
                    "text-4xl font-black italic tracking-tighter tabular-nums",
                    initialHome === undefined ? "text-gray-200" : "text-primary"
                  )}>
                    {initialHome ?? '0'}
                  </span>
                  <span className="text-2xl font-black text-gray-200 italic">:</span>
                  <span className={cn(
                    "text-4xl font-black italic tracking-tighter tabular-nums",
                    initialAway === undefined ? "text-gray-200" : "text-primary"
                  )}>
                    {initialAway ?? '0'}
                  </span>
                </div>
                {isFinished && (
                  <div className="mt-2 text-[11px] font-black text-orange-600 uppercase tracking-widest bg-orange-100 px-3 py-0.5 rounded-full shadow-sm">
                    Final: {fixture.home_score} - {fixture.away_score}
                  </div>
                )}
                {(isLive || isStandardLocked) && !isFinished && (
                  <div className="mt-2 text-[11px] font-black text-green-600 uppercase tracking-widest bg-green-50 px-3 py-0.5 rounded-full shadow-sm">
                    Live Score: {fixture.home_score ?? 0} - {fixture.away_score ?? 0}
                  </div>
                )}
              </div>
            )}

            <div className="mt-4">
               {editing ? null : (
                 !isStandardLocked ? (
                    <Button variant="ghost" size="icon" onClick={() => setEditing(true)} className="rounded-full bg-white border border-gray-100 h-10 w-10 hover:bg-primary hover:text-white hover:border-primary transition-all shadow-md">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                 ) : isLifelineAvailable ? (
                    <Button 
                      onClick={() => setEditing(true)} 
                      className="rounded-full bg-yellow-500 hover:bg-yellow-600 text-white px-4 h-9 font-black uppercase text-[9px] tracking-widest flex items-center gap-2 shadow-xl animate-bounce"
                    >
                      <Zap className="h-3 w-3 fill-white" /> Use Lifeline ({lifelinesRemaining})
                    </Button>
                 ) : null
               )}
            </div>
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center flex-1 text-center min-w-0">
            <div className="mb-2">
              {fixture.away_flag ? (
                <div className="relative h-12 w-12 sm:h-16 sm:w-16">
                  <Image 
                    src={fixture.away_flag} 
                    alt={`${fixture.away_team} flag`} 
                    fill
                    className="rounded-full object-cover ring-4 ring-gray-50 shadow-md"
                  />
                </div>
              ) : (
                <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-gray-50 border-2 border-dashed border-gray-200 text-[10px] font-black text-gray-400 uppercase italic">
                  TBD
                </div>
              )}
            </div>
            <span className="text-[11px] font-black uppercase tracking-tight text-gray-900 truncate w-full px-1">{fixture.away_team}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
