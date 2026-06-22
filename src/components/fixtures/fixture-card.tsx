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
  supporters?: any[]
  currentUserId?: string
}

const AvatarStack = ({ supporters }: { supporters: any[] }) => {
  if (!supporters || supporters.length === 0) return null
  
  const MAX_VISIBLE = 5
  const visibleSupporters = supporters.slice(0, MAX_VISIBLE)
  const remainingCount = Math.max(0, supporters.length - MAX_VISIBLE)

  return (
    <div className="flex -space-x-2.5 overflow-hidden py-1">
      {visibleSupporters.map((s, idx) => (
        <div key={`${s.user_id}-${idx}`} className="inline-block ring-2 ring-background rounded-full transition-transform hover:-translate-y-1 shadow-sm">
          <UserAvatar profile={s} className="h-7 w-7 border-0" />
        </div>
      ))}
      {remainingCount > 0 && (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted ring-2 ring-background shadow-sm">
          <span className="text-[9px] font-black text-primary">+{remainingCount}</span>
        </div>
      )}
    </div>
  )
}

export function FixtureCard({ 
  fixture, 
  initialHome, 
  initialAway, 
  onSave, 
  lifelinesRemaining = 0,
  userProfile,
  supporters = [],
  currentUserId
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

  const homeSupporters = supporters.filter(s => s.prediction_side === 'home')
  const awaySupporters = supporters.filter(s => s.prediction_side === 'away')
  const drawSupporters = supporters.filter(s => s.prediction_side === 'draw')

  const myPrediction = supporters.find(s => s.user_id === currentUserId)

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

  return (
    <Card className={cn(
      "relative isolate overflow-hidden border-border/50 bg-card text-foreground shadow-2xl transition-all duration-500 rounded-[2.5rem]",
      isLive ? "ring-2 ring-emerald-500/50" : ""
    )}>
      {/* Dynamic Background Gradients */}
      <div className={cn(
        "absolute inset-0 rounded-[inherit] pointer-events-none transition-opacity duration-1000 opacity-20 dark:opacity-40",
        isLive 
          ? "bg-gradient-to-br from-emerald-500 via-transparent to-teal-500" 
          : isFinished
            ? "bg-gradient-to-br from-zinc-500 via-transparent to-orange-500"
            : "bg-gradient-to-br from-indigo-500 via-transparent to-purple-500"
      )} />
      
      {/* Decorative Glows */}
      <div className={cn(
        "absolute -left-16 -top-16 h-48 w-48 rounded-full blur-3xl transition-colors duration-1000 opacity-20 pointer-events-none",
        isLive ? "bg-emerald-500" : isFinished ? "bg-orange-500" : "bg-purple-500"
      )} />
      <div className={cn(
        "absolute -right-16 -bottom-16 h-48 w-48 rounded-full blur-3xl transition-colors duration-1000 opacity-20 pointer-events-none",
        isLive ? "bg-teal-500" : isFinished ? "bg-zinc-500" : "bg-cyan-500"
      )} />

      <CardContent className="p-0 relative z-10">
        {/* Top Header Pill */}
        <div className="px-6 py-4 flex justify-between items-center border-b border-border/50 bg-background/40 backdrop-blur-md rounded-t-[inherit] overflow-hidden">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
              {fixture.stage} • {dateStr}
            </span>
            {(fixture.group_name || fixture.matchday) && (
              <span className="text-[9px] font-bold uppercase text-muted-foreground/60 tracking-wider mt-0.5">
                {fixture.group_name && `Group ${fixture.group_name}`} {fixture.group_name && fixture.matchday && '•'} {fixture.matchday && `MD ${fixture.matchday}`}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {isFinished ? (
              <span className="status-pill pill-final">
                FINAL
              </span>
            ) : isLive ? (
              <div className="status-pill pill-live">
                <div className="h-1 w-1 rounded-full bg-black" /> LIVE
              </div>
            ) : isStandardLocked ? (
              <span className="status-pill pill-locked">
                <Lock className="h-2.5 w-2.5" /> LOCKED
              </span>
            ) : (
              <span className="status-pill pill-open">
                {timeStr}
              </span>
            )}
          </div>
        </div>

        {/* Match Action Section */}
        <div className="p-8 pb-4 flex items-center justify-between gap-2">
          {/* Home Team */}
          <div className="flex flex-col items-center flex-1 text-center min-w-0 gap-3">
            <div className="relative group/flag">
              {fixture.home_flag ? (
                <div className="relative h-20 w-20 sm:h-24 sm:w-24 transition-transform group-hover/flag:scale-105 duration-500">
                  <div className="absolute inset-0 rounded-full bg-background/50 backdrop-blur-sm border border-border shadow-lg" />
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
                <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-muted border border-border text-[10px] font-black text-muted-foreground uppercase italic">
                  TBD
                </div>
              )}
            </div>
            <div className="space-y-1.5 w-full flex flex-col items-center">
              <span className="text-sm font-black uppercase tracking-tight text-foreground block truncate">{fixture.home_team}</span>
              <AvatarStack supporters={homeSupporters} />
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
                    className="w-14 h-16 text-center text-3xl font-black bg-muted border-2 border-primary/50 text-foreground rounded-2xl focus:border-primary outline-none transition-all shadow-inner"
                    autoFocus
                  />
                  <span className="text-3xl font-black text-muted-foreground italic">:</span>
                  <input 
                    type="number" 
                    value={aScore} 
                    onChange={(e) => setAScore(e.target.value)}
                    className="w-14 h-16 text-center text-3xl font-black bg-muted border-2 border-primary/50 text-foreground rounded-2xl focus:border-primary outline-none transition-all shadow-inner"
                  />
                </div>
                <Button onClick={() => handleSave(isStandardLocked)} className="soft-button h-12 px-8 bg-primary text-primary-foreground hover:opacity-90 shadow-lg border-2 border-primary/20">
                  <Check className="h-4 w-4 mr-2" /> LOCK PICK
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className={cn(
                  "flex items-center gap-4 px-6 py-4 rounded-[2rem] transition-all duration-500 border border-border/50 shadow-inner bg-background/50",
                  isLive ? "ring-1 ring-emerald-500/20" : ""
                )}>
                  <span className={cn(
                    "text-5xl font-black italic tracking-tighter tabular-nums drop-shadow-sm",
                    isFinished || isLive ? "text-foreground" : "text-muted-foreground/30"
                  )}>
                    {isFinished || isLive ? (fixture.home_score ?? 0) : '0'}
                  </span>
                  <span className="text-3xl font-black text-muted-foreground/30 italic">:</span>
                  <span className={cn(
                    "text-5xl font-black italic tracking-tighter tabular-nums drop-shadow-sm",
                    isFinished || isLive ? "text-foreground" : "text-muted-foreground/30"
                  )}>
                    {isFinished || isLive ? (fixture.away_score ?? 0) : '0'}
                  </span>
                </div>
                
                <div className="mt-4 flex flex-col items-center gap-2">
                  <AvatarStack supporters={drawSupporters} />
                  
                  {myPrediction && (
                    <div className="mt-1 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <Zap className="h-3 w-3 text-primary fill-primary" />
                      <span className="text-[10px] font-black uppercase italic text-primary tracking-widest whitespace-nowrap">
                        Your Pick: {myPrediction.predicted_home_score} - {myPrediction.predicted_away_score}
                      </span>
                    </div>
                  )}

                  <div className="mt-2 flex flex-col items-center gap-3">
                    {isFinished ? (
                      <div className="flex items-center gap-2 text-[11px] font-black text-muted-foreground uppercase tracking-widest">
                         Match Result
                      </div>
                    ) : isLive ? (
                      <div className="flex items-center gap-2 text-[11px] font-black text-emerald-500 uppercase tracking-widest">
                        <Timer className="h-3 w-3 animate-spin-slow" /> LIVE UPDATE
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        {!editing && (
                           !isStandardLocked ? (
                              <Button 
                                onClick={() => setEditing(true)} 
                                className="soft-button h-10 px-6 bg-muted text-foreground border border-border/50 hover:bg-primary hover:text-primary-foreground group/btn"
                              >
                                <Edit2 className="h-3 w-3 mr-2 group-hover/btn:rotate-12" /> {myPrediction ? 'Change Pick' : 'Set Score'}
                              </Button>
                           ) : isLifelineAvailable ? (
                              <Button 
                                onClick={() => setEditing(true)} 
                                className="soft-button h-10 px-6 bg-primary text-primary-foreground flex items-center gap-2 shadow-lg animate-pulse"
                              >
                                <Zap className="h-3.5 w-3.5 fill-current" /> Use Lifeline
                              </Button>
                           ) : null
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center flex-1 text-center min-w-0 gap-3">
            <div className="relative group/flag">
              {fixture.away_flag ? (
                <div className="relative h-20 w-20 sm:h-24 sm:w-24 transition-transform group-hover/flag:scale-105 duration-500">
                  <div className="absolute inset-0 rounded-full bg-background/50 backdrop-blur-sm border border-border shadow-lg" />
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
                <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-muted border border-border text-[10px] font-black text-muted-foreground uppercase italic">
                  TBD
                </div>
              )}
            </div>
            <div className="space-y-1.5 w-full flex flex-col items-center">
              <span className="text-sm font-black uppercase tracking-tight text-foreground block truncate">{fixture.away_team}</span>
              <AvatarStack supporters={awaySupporters} />
            </div>
          </div>
        </div>

        {/* Scorers Section */}
        {showScorers && (
          <div className="px-8 pb-8">
            <div className="p-4 bg-muted/40 rounded-3xl border border-border/40 flex flex-col gap-3 shadow-inner backdrop-blur-sm">
               <div className="flex items-center justify-center gap-4">
                 <div className="h-[1px] bg-border/40 flex-1" />
                 <div className="flex items-center gap-2">
                    <Goal className="h-3 w-3 text-primary" />
                    <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">Goal Events</span>
                 </div>
                 <div className="h-[1px] bg-border/40 flex-1" />
               </div>
               <div className="flex justify-between gap-6 pt-1">
                  <div className="flex-1 min-w-0">
                    {homeScorers && (
                      <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed italic break-words">
                        {homeScorers}
                      </p>
                    )}
                  </div>
                  <div className="flex-1 text-right min-w-0">
                    {awayScorers && (
                      <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed italic break-words">
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
