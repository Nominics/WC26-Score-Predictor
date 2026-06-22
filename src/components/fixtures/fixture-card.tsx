
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit2, Check, Lock, Trophy, Zap, Timer, Goal, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { DateTime } from "luxon"
import Image from "next/image"
import { UserAvatar } from "@/components/user-avatar"

interface FixtureCardProps {
  fixture: any
  initialHome?: number
  initialAway?: number
  onSave: (id: string, h: number, a: number, isLifeline: boolean) => void
  lifelinesRemaining?: number
  userProfile?: any
}

export function FixtureCard({ 
  fixture, 
  initialHome, 
  initialAway, 
  onSave, 
  lifelinesRemaining = 0,
  userProfile 
}: FixtureCardProps) {
  const [hScore, setHScore] = useState<string>(initialHome?.toString() || "")
  const [aScore, setAScore] = useState<string>(initialAway?.toString() || "")
  const [editing, setEditing] = useState(false)
  const [isStandardLocked, setIsStandardLocked] = useState(false)
  const [isLifelineAvailable, setIsLifelineAvailable] = useState(false)
  const [isTotalLocked, setIsTotalLocked] = useState(false)

  const kickoff = DateTime.fromISO(fixture.kickoff_at)
  const timeStr = kickoff.isValid ? kickoff.toFormat('HH:mm') : 'TBD'
  const dateStr = kickoff.isValid ? kickoff.toFormat('LLL dd') : ''

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

  const cleanScorers = (scorers: string | null) => {
    if (!scorers || scorers === 'null') return null;
    let cleaned = scorers.replace(/[{}"']/g, '');
    const parts = cleaned.split(/[;,]/).map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) return null;
    return parts.join(' • ');
  }

  const homeScorers = cleanScorers(fixture.home_scorers);
  const awayScorers = cleanScorers(fixture.away_scorers);
  const showScorers = (isLive || isFinished) && (homeScorers || awayScorers);

  // Prediction side logic
  const hasPrediction = initialHome !== undefined && initialAway !== undefined
  const predictedSide = !hasPrediction
    ? null
    : initialHome! > initialAway!
      ? "home"
      : initialHome! < initialAway!
        ? "away"
        : "draw"

  const YourPickMarker = ({ label }: { label?: string }) => (
    <div className="flex flex-col items-center gap-1 animate-in fade-in zoom-in duration-300">
      <div className="relative">
        <UserAvatar 
          profile={userProfile} 
          className="h-8 w-8 border-2 border-white shadow-xl" 
        />
        <div className="absolute -top-1 -right-1 bg-primary rounded-full p-0.5 border border-white">
          <Star className="h-2 w-2 text-black fill-black" />
        </div>
      </div>
      <span className="text-[8px] font-black uppercase text-primary tracking-widest">{label || "Your Pick"}</span>
    </div>
  )

  return (
    <Card className={cn(
      "relative overflow-hidden border-white/10 bg-slate-950 text-white shadow-2xl transition-all duration-500 rounded-[28px]",
      isLive ? "ring-2 ring-emerald-500/50" : ""
    )}>
      {/* Dynamic Background Gradients */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-1000",
        isLive 
          ? "bg-gradient-to-br from-emerald-950 via-slate-950 to-teal-900/60 opacity-100" 
          : isFinished
            ? "bg-gradient-to-br from-zinc-900 via-slate-950 to-orange-900/40 opacity-100"
            : "bg-gradient-to-br from-indigo-950 via-slate-950 to-purple-900/60 opacity-100"
      )} />
      
      {/* Decorative Blur Spheres */}
      <div className={cn(
        "absolute -left-16 -top-16 h-48 w-48 rounded-full blur-3xl transition-colors duration-1000",
        isLive ? "bg-emerald-500/20" : isFinished ? "bg-orange-500/10" : "bg-purple-500/20"
      )} />
      <div className={cn(
        "absolute -right-16 -bottom-16 h-48 w-48 rounded-full blur-3xl transition-colors duration-1000",
        isLive ? "bg-teal-500/20" : isFinished ? "bg-zinc-500/20" : "bg-cyan-500/20"
      )} />

      <CardContent className="p-0 relative z-10">
        {/* Top Header Pill */}
        <div className="px-6 py-4 flex justify-between items-center border-b border-white/5 bg-white/5 backdrop-blur-md">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50">
              {fixture.stage} • {dateStr}
            </span>
            {(fixture.group_name || fixture.matchday) && (
              <span className="text-[9px] font-bold uppercase text-white/30 tracking-wider mt-0.5">
                {fixture.group_name && `Group ${fixture.group_name}`} {fixture.group_name && fixture.matchday && '•'} {fixture.matchday && `MD ${fixture.matchday}`}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {isFinished ? (
              <span className="text-[9px] font-black text-orange-400 uppercase italic tracking-widest bg-orange-400/10 px-3 py-1 rounded-full border border-orange-400/20">
                FINAL
              </span>
            ) : isLive ? (
              <div className="flex items-center gap-2 bg-emerald-500 text-black px-3 py-1 rounded-full text-[9px] font-black uppercase italic animate-pulse shadow-lg shadow-emerald-500/20">
                <div className="h-1 w-1 rounded-full bg-black" /> LIVE
              </div>
            ) : isStandardLocked ? (
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                <Lock className="h-2.5 w-2.5" /> LOCKED
              </span>
            ) : (
              <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                {timeStr}
              </span>
            )}
          </div>
        </div>

        {/* Match Action Section */}
        <div className="p-8 pb-6 flex items-center justify-between gap-2">
          {/* Home Team */}
          <div className="flex flex-col items-center flex-1 text-center min-w-0 gap-3">
            <div className="relative group/flag">
              {fixture.home_flag ? (
                <div className="relative h-20 w-20 sm:h-24 sm:w-24 transition-transform group-hover/flag:scale-105 duration-500">
                  <div className="absolute inset-0 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 shadow-2xl" />
                  <div className="relative h-full w-full rounded-full overflow-hidden p-1">
                    <Image 
                      src={fixture.home_flag} 
                      alt={fixture.home_team} 
                      fill
                      className="rounded-full object-cover"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-white/30 uppercase italic">
                  TBD
                </div>
              )}
            </div>
            <div className="space-y-1 w-full">
              <span className="text-sm font-black uppercase tracking-tight text-white block truncate">{fixture.home_team}</span>
              {predictedSide === "home" && <YourPickMarker />}
            </div>
          </div>

          {/* Score Area */}
          <div className="flex flex-col items-center justify-center min-w-[140px]">
            {editing ? (
              <div className="flex flex-col items-center gap-4 py-2 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    value={hScore} 
                    onChange={(e) => setHScore(e.target.value)}
                    className="w-14 h-16 text-center text-3xl font-black bg-white/10 border-2 border-primary/50 text-white rounded-2xl focus:border-primary outline-none transition-all shadow-2xl"
                    autoFocus
                  />
                  <span className="text-3xl font-black text-white/30 italic">:</span>
                  <input 
                    type="number" 
                    value={aScore} 
                    onChange={(e) => setAScore(e.target.value)}
                    className="w-14 h-16 text-center text-3xl font-black bg-white/10 border-2 border-primary/50 text-white rounded-2xl focus:border-primary outline-none transition-all shadow-2xl"
                  />
                </div>
                <Button onClick={() => handleSave(isStandardLocked)} className="rounded-full bg-primary text-black hover:bg-white transition-all px-8 h-12 font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl border-2 border-primary">
                  <Check className="h-4 w-4 mr-2" /> LOCK PICK
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className={cn(
                  "flex items-center gap-4 px-6 py-4 rounded-[2rem] transition-all duration-500 border border-white/10 shadow-inner",
                  isLive ? "bg-emerald-500/10" : "bg-white/5"
                )}>
                  <span className={cn(
                    "text-5xl font-black italic tracking-tighter tabular-nums drop-shadow-lg",
                    initialHome === undefined ? "text-white/20" : "text-white"
                  )}>
                    {isFinished || isLive ? (fixture.home_score ?? 0) : (initialHome ?? '0')}
                  </span>
                  <span className="text-3xl font-black text-white/20 italic">:</span>
                  <span className={cn(
                    "text-5xl font-black italic tracking-tighter tabular-nums drop-shadow-lg",
                    initialAway === undefined ? "text-white/20" : "text-white"
                  )}>
                    {isFinished || isLive ? (fixture.away_score ?? 0) : (initialAway ?? '0')}
                  </span>
                </div>
                
                <div className="mt-4 flex flex-col items-center gap-3">
                  {predictedSide === "draw" && <YourPickMarker label="Draw Pick" />}
                  
                  {isFinished ? (
                    <div className="flex items-center gap-2 text-[11px] font-black text-white/50 uppercase tracking-widest">
                       Match Result
                    </div>
                  ) : isLive ? (
                    <div className="flex items-center gap-2 text-[11px] font-black text-emerald-400 uppercase tracking-widest">
                      <Timer className="h-3 w-3 animate-spin-slow" /> LIVE UPDATE
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                       {editing ? null : (
                         !isStandardLocked ? (
                            <Button 
                              onClick={() => setEditing(true)} 
                              className="rounded-full bg-white/5 text-white border border-white/10 h-10 px-6 hover:bg-primary hover:text-black transition-all font-black uppercase text-[10px] tracking-widest group/btn"
                            >
                              <Edit2 className="h-3 w-3 mr-2 group-hover/btn:rotate-12" /> {hasPrediction ? 'Change Pick' : 'Set Score'}
                            </Button>
                         ) : isLifelineAvailable ? (
                            <Button 
                              onClick={() => setEditing(true)} 
                              className="rounded-full bg-primary text-black px-6 h-10 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-2xl animate-pulse"
                            >
                              <Zap className="h-3.5 w-3.5 fill-black" /> Use Lifeline
                            </Button>
                         ) : null
                       )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center flex-1 text-center min-w-0 gap-3">
            <div className="relative group/flag">
              {fixture.away_flag ? (
                <div className="relative h-20 w-20 sm:h-24 sm:w-24 transition-transform group-hover/flag:scale-105 duration-500">
                  <div className="absolute inset-0 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 shadow-2xl" />
                  <div className="relative h-full w-full rounded-full overflow-hidden p-1">
                    <Image 
                      src={fixture.away_flag} 
                      alt={fixture.away_team} 
                      fill
                      className="rounded-full object-cover"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-white/30 uppercase italic">
                  TBD
                </div>
              )}
            </div>
            <div className="space-y-1 w-full">
              <span className="text-sm font-black uppercase tracking-tight text-white block truncate">{fixture.away_team}</span>
              {predictedSide === "away" && <YourPickMarker />}
            </div>
          </div>
        </div>

        {/* Scorers Section */}
        {showScorers && (
          <div className="px-8 pb-8">
            <div className="p-4 bg-white/5 rounded-3xl border border-white/10 flex flex-col gap-3 shadow-inner backdrop-blur-sm">
               <div className="flex items-center justify-center gap-4">
                 <div className="h-[1px] bg-white/5 flex-1" />
                 <div className="flex items-center gap-2">
                    <Goal className="h-3 w-3 text-primary" />
                    <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">Goal Events</span>
                 </div>
                 <div className="h-[1px] bg-white/5 flex-1" />
               </div>
               <div className="flex justify-between gap-6 pt-1">
                  <div className="flex-1 min-w-0">
                    {homeScorers && (
                      <p className="text-[10px] font-bold text-white/40 uppercase leading-relaxed italic break-words">
                        {homeScorers}
                      </p>
                    )}
                  </div>
                  <div className="flex-1 text-right min-w-0">
                    {awayScorers && (
                      <p className="text-[10px] font-bold text-white/40 uppercase leading-relaxed italic break-words">
                        {awayScorers}
                      </p>
                    )}
                  </div>
               </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
