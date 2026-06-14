"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit2, Check, Lock, Trophy, Zap, Timer } from "lucide-react"
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
      "relative overflow-hidden border-0 rounded-[2.5rem] transition-all duration-500 group shadow-2xl hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]",
      isLive ? "bg-white ring-2 ring-green-500" : 
      isFinished ? "bg-white opacity-95" : 
      "bg-white"
    )}>
      {isLive && <div className="absolute top-0 left-0 w-full h-1 bg-green-500 animate-pulse z-20" />}
      
      <CardContent className="p-0 relative z-10">
        <div className="px-6 py-2 bg-gray-50/80 border-b border-gray-100/50 flex justify-between items-center">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                Fixture {fixture.match_number} • {fixture.stage}
            </span>
            {isFinished ? (
               <span className="text-[9px] font-black text-orange-600 uppercase italic tracking-widest bg-orange-100 px-2 py-0.5 rounded-full">Final Result</span>
            ) : isLive ? (
               <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">In Progress</span>
               </div>
            ) : (
               <span className="text-[9px] font-black text-primary uppercase tracking-widest">{timeStr} Local</span>
            )}
        </div>

        <div className="p-8 flex items-center justify-between gap-4">
          {/* Home Team */}
          <div className="flex flex-col items-center flex-1 text-center min-w-0">
            <div className="mb-3 relative group/flag">
              {fixture.home_flag ? (
                <div className="relative h-16 w-16 sm:h-20 sm:w-20 transition-transform group-hover/flag:scale-105 duration-300">
                  <Image 
                    src={fixture.home_flag} 
                    alt={`${fixture.home_team} flag`} 
                    fill
                    className="rounded-full object-cover ring-8 ring-gray-50 shadow-xl"
                  />
                  <div className="absolute inset-0 rounded-full border border-black/5" />
                </div>
              ) : (
                <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-gray-50 border-2 border-dashed border-gray-200 text-[11px] font-black text-gray-300 uppercase italic">
                  TBD
                </div>
              )}
            </div>
            <span className="text-[13px] font-black uppercase tracking-tight text-gray-900 truncate w-full px-1 leading-tight">{fixture.home_team}</span>
          </div>

          {/* Center Area (Score/Status) */}
          <div className="flex flex-col items-center justify-center min-w-[150px]">
            {editing ? (
              <div className="flex flex-col items-center gap-4 py-2">
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    value={hScore} 
                    onChange={(e) => setHScore(e.target.value)}
                    className="w-14 h-14 text-center text-2xl font-black bg-gray-50 border-2 border-primary rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-inner"
                    autoFocus
                  />
                  <span className="text-2xl font-black text-gray-300 italic">:</span>
                  <input 
                    type="number" 
                    value={aScore} 
                    onChange={(e) => setAScore(e.target.value)}
                    className="w-14 h-14 text-center text-2xl font-black bg-gray-50 border-2 border-primary rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-inner"
                  />
                </div>
                <Button onClick={() => handleSave(isStandardLocked)} className="rounded-full bg-primary hover:bg-black hover:text-primary px-8 h-11 font-black uppercase text-[11px] tracking-widest shadow-xl active:scale-95 transition-all text-black border-2 border-primary">
                  <Check className="h-4 w-4 mr-2" /> {isStandardLocked ? 'Use Lifeline' : 'Lock Prediction'}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className={cn(
                  "flex items-center gap-6 px-8 py-3 rounded-3xl transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] border border-gray-100/50",
                  isLive ? "bg-green-50/50" : "bg-gray-50/80"
                )}>
                  <span className={cn(
                    "text-5xl font-black italic tracking-tighter tabular-nums",
                    initialHome === undefined ? "text-gray-200" : "text-black"
                  )}>
                    {initialHome ?? '0'}
                  </span>
                  <span className="text-3xl font-black text-gray-200 italic">:</span>
                  <span className={cn(
                    "text-5xl font-black italic tracking-tighter tabular-nums",
                    initialAway === undefined ? "text-gray-200" : "text-black"
                  )}>
                    {initialAway ?? '0'}
                  </span>
                </div>
                
                <div className="mt-4 flex flex-col items-center gap-2">
                  {isFinished ? (
                    <div className="flex items-center gap-2 text-[12px] font-black text-orange-600 uppercase tracking-widest bg-orange-100 px-4 py-1 rounded-full shadow-sm">
                      <Trophy className="h-3 w-3" /> Result: {fixture.home_score} - {fixture.away_score}
                    </div>
                  ) : isLive ? (
                    <div className="flex items-center gap-2 text-[12px] font-black text-green-600 uppercase tracking-widest bg-green-50 px-4 py-1 rounded-full shadow-sm">
                      <Timer className="h-3 w-3" /> Live: {fixture.home_score ?? 0} - {fixture.away_score ?? 0}
                    </div>
                  ) : isStandardLocked ? (
                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-4 py-1 rounded-full">
                      <Lock className="h-2.5 w-2.5" /> Predictions Locked
                    </div>
                  ) : (
                    <div className="text-[10px] font-black text-primary uppercase tracking-widest px-4 py-1">
                      Pick Your Score
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6">
               {editing ? null : (
                 !isStandardLocked ? (
                    <Button 
                      onClick={() => setEditing(true)} 
                      className="rounded-full bg-primary text-black border-2 border-primary h-12 px-8 hover:bg-black hover:text-primary transition-all shadow-xl font-black uppercase text-[11px] tracking-widest group/btn"
                    >
                      <Edit2 className="h-4 w-4 mr-2 group-hover/btn:rotate-12 transition-transform" /> {initialHome !== undefined ? 'Change Pick' : 'Set Prediction'}
                    </Button>
                 ) : isLifelineAvailable ? (
                    <Button 
                      onClick={() => setEditing(true)} 
                      className="rounded-full bg-yellow-400 hover:bg-yellow-500 text-yellow-950 px-6 h-12 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-xl animate-bounce hover:animate-none transition-all"
                    >
                      <Zap className="h-3.5 w-3.5 fill-yellow-950" /> Use Lifeline ({lifelinesRemaining})
                    </Button>
                 ) : null
               )}
            </div>
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center flex-1 text-center min-w-0">
            <div className="mb-3 relative group/flag">
              {fixture.away_flag ? (
                <div className="relative h-16 w-16 sm:h-20 sm:w-20 transition-transform group-hover/flag:scale-105 duration-300">
                  <Image 
                    src={fixture.away_flag} 
                    alt={`${fixture.away_team} flag`} 
                    fill
                    className="rounded-full object-cover ring-8 ring-gray-50 shadow-xl"
                  />
                  <div className="absolute inset-0 rounded-full border border-black/5" />
                </div>
              ) : (
                <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-gray-50 border-2 border-dashed border-gray-200 text-[11px] font-black text-gray-300 uppercase italic">
                  TBD
                </div>
              )}
            </div>
            <span className="text-[13px] font-black uppercase tracking-tight text-gray-900 truncate w-full px-1 leading-tight">{fixture.away_team}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
