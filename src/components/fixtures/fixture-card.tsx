
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit2, Check, Lock, Trophy, Zap, Timer, Goal, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { DateTime } from "luxon"
import Image from "next/image"
import { UserAvatar } from "@/components/user-avatar"

const APP_ZONE = "Indian/Maldives"

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
  
  const MAX_VISIBLE = 4
  const visibleSupporters = supporters.slice(0, MAX_VISIBLE)
  const remainingCount = Math.max(0, supporters.length - MAX_VISIBLE)

  return (
    <div className="flex -space-x-2 overflow-visible py-1">
      {visibleSupporters.map((s, idx) => (
        <div key={`${s.user_id}-${idx}`} className="inline-block ring-2 ring-background rounded-full transition-transform hover:-translate-y-0.5 shadow-sm overflow-visible">
          <UserAvatar profile={s} className="h-6 w-6 sm:h-7 sm:w-7 border-0" />
        </div>
      ))}
      {remainingCount > 0 && (
        <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-muted ring-2 ring-background shadow-sm overflow-visible">
          <span className="premium-gold-gradient-number text-[8px] sm:text-[9px]">+{remainingCount}</span>
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

  // Strictly use kickoff_at as the source of truth for display in the app zone
  const kickoff = DateTime.fromISO(fixture.kickoff_at).setZone(APP_ZONE)
  const timeStr = kickoff.isValid ? kickoff.toFormat('HH:mm') : 'TBD'
  const dateStr = kickoff.isValid ? kickoff.toFormat('LLL dd') : ''

  useEffect(() => {
    const checkLock = () => {
      const now = DateTime.now()
      const standardLock = DateTime.fromISO(fixture.kickoff_at).plus({ minutes: 15 })
      const lifelineLock = DateTime.fromISO(fixture.kickoff_at).plus({ minutes: 50 })
      
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
      "relative isolate overflow-visible border-border/50 bg-card text-foreground shadow-xl transition-all duration-500 rounded-[2rem]",
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
      
      <CardContent className="p-0 relative z-10 overflow-visible">
        {/* Top Header Pill */}
        <div className="px-5 py-3 flex justify-between items-center border-b border-border/50 bg-background/40 backdrop-blur-md rounded-t-[inherit] overflow-visible">
          <div className="flex flex-col overflow-visible">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground overflow-visible">
              {fixture.stage} • {dateStr}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 overflow-visible">
            {isFinished ? (
              <span className="status-pill pill-final px-2 py-0.5 text-[8px]">FINAL</span>
            ) : isLive ? (
              <div className="status-pill pill-live px-2 py-0.5 text-[8px]">
                <div className="h-1 w-1 rounded-full bg-black" /> LIVE
              </div>
            ) : isStandardLocked ? (
              <span className="status-pill pill-locked px-2 py-0.5 text-[8px]">
                <Lock className="h-2 w-2" /> LOCKED
              </span>
            ) : (
              <span className="status-pill pill-open px-2 py-0.5 text-[8px]">
                {timeStr}
              </span>
            )}
          </div>
        </div>

        {/* Match Action Section */}
        <div className="p-4 sm:p-6 pb-2 sm:pb-4 flex items-center justify-between gap-1 sm:gap-2 overflow-visible">
          {/* Home Team */}
          <div className="flex flex-col items-center flex-1 text-center min-w-0 gap-2 sm:gap-3 overflow-visible">
            <div className="relative group/flag overflow-visible">
              {fixture.home_flag ? (
                <div className="relative h-16 w-16 sm:h-20 sm:w-20 transition-transform duration-500 overflow-visible">
                  <div className="absolute inset-0 rounded-full bg-background/50 backdrop-blur-sm border border-border shadow-md" />
                  <div className="relative h-full w-full rounded-full overflow-hidden p-0.5 sm:p-1">
                    <Image src={fixture.home_flag} alt={fixture.home_team} fill className="rounded-full object-cover" />
                  </div>
                </div>
              ) : (
                <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-muted border border-border text-[8px] font-black text-muted-foreground uppercase italic">TBD</div>
              )}
            </div>
            <div className="space-y-1 w-full flex flex-col items-center overflow-visible">
              <span className="text-[12px] sm:text-sm font-black uppercase tracking-tight text-foreground block truncate max-w-full overflow-visible">{fixture.home_team}</span>
              <AvatarStack supporters={homeSupporters} />
            </div>
          </div>

          {/* Score Area */}
          <div className="flex flex-col items-center justify-center min-w-[100px] sm:min-w-[140px] overflow-visible">
            {editing ? (
              <div className="flex flex-col items-center gap-3 py-1 animate-in zoom-in-95 duration-200 overflow-visible">
                <div className="flex items-center gap-2 overflow-visible">
                  <input type="number" value={hScore} onChange={(e) => setHScore(e.target.value)} className="w-10 h-12 sm:w-14 sm:h-16 text-center text-xl sm:text-3xl font-black bg-muted border-2 border-primary/50 text-foreground rounded-xl sm:rounded-2xl outline-none" autoFocus />
                  <span className="text-xl sm:text-3xl font-black text-muted-foreground italic">:</span>
                  <input type="number" value={aScore} onChange={(e) => setAScore(e.target.value)} className="w-10 h-12 sm:w-14 sm:h-16 text-center text-xl sm:text-3xl font-black bg-muted border-2 border-primary/50 text-foreground rounded-xl sm:rounded-2xl outline-none" />
                </div>
                <Button onClick={() => handleSave(isStandardLocked)} className="soft-button h-10 px-5 sm:h-12 sm:px-8 premium-gold-pill text-[10px] sm:text-xs">
                  <Check className="h-3 w-3 mr-1.5" /> LOCK PICK
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center overflow-visible">
                <div className={cn(
                  "flex items-center justify-center min-w-[110px] sm:min-w-[160px] min-h-[64px] sm:min-h-[72px] px-6 sm:px-8 py-3 rounded-[1.5rem] sm:rounded-[2rem] border border-border/50 shadow-inner bg-background/50 overflow-visible",
                  isLive ? "ring-1 ring-emerald-500/20" : ""
                )}>
                  <span className="premium-gold-gradient-number text-[44px] sm:text-6xl leading-[1.15] pt-1 pb-1 tabular-nums">
                    {isFinished || isLive ? (fixture.home_score ?? 0) : '0'}
                  </span>
                  <span className="mx-2 text-[32px] sm:text-5xl font-black leading-[1.15] text-muted-foreground/30">:</span>
                  <span className="premium-gold-gradient-number text-[44px] sm:text-6xl leading-[1.15] pt-1 pb-1 tabular-nums">
                    {isFinished || isLive ? (fixture.away_score ?? 0) : '0'}
                  </span>
                </div>
                
                <div className="mt-3 flex flex-col items-center overflow-visible">
                  <AvatarStack supporters={drawSupporters} />
                  {myPrediction && (
                    <div className="mt-0.5 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 flex items-center gap-1.5 overflow-visible">
                      <Zap className="h-2.5 w-2.5 text-primary fill-primary" />
                      <span className="premium-gold-gradient-number text-[8px] sm:text-[9px] whitespace-nowrap">
                        {myPrediction.predicted_home_score} - {myPrediction.predicted_away_score}
                      </span>
                    </div>
                  )}

                  <div className="mt-1 flex flex-col items-center overflow-visible">
                    {!editing && (
                       !isStandardLocked ? (
                          <Button onClick={() => setEditing(true)} className="soft-button h-8 px-4 sm:h-10 sm:px-6 bg-muted text-foreground border border-border/50 text-[9px] sm:text-[10px] hover:premium-gold-gradient-bg hover:text-black">
                            <Edit2 className="h-2.5 w-2.5 mr-1.5" /> {myPrediction ? 'Edit' : 'Pick'}
                          </Button>
                       ) : isLifelineAvailable ? (
                          <Button onClick={() => setEditing(true)} className="soft-button h-8 px-4 premium-gold-pill text-[9px] shadow-lg animate-pulse">
                            <Zap className="h-3 w-3 fill-current mr-1" /> Lifeline
                          </Button>
                       ) : null
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center flex-1 text-center min-w-0 gap-2 sm:gap-3 overflow-visible">
            <div className="relative group/flag overflow-visible">
              {fixture.away_flag ? (
                <div className="relative h-16 w-16 sm:h-20 sm:w-20 transition-transform duration-500 overflow-visible">
                  <div className="absolute inset-0 rounded-full bg-background/50 backdrop-blur-sm border border-border shadow-md" />
                  <div className="relative h-full w-full rounded-full overflow-hidden p-0.5 sm:p-1">
                    <Image src={fixture.away_flag} alt={fixture.away_team} fill className="rounded-full object-cover" />
                  </div>
                </div>
              ) : (
                <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-muted border border-border text-[8px] font-black text-muted-foreground uppercase italic">TBD</div>
              )}
            </div>
            <div className="space-y-1 w-full flex flex-col items-center overflow-visible">
              <span className="text-[12px] sm:text-sm font-black uppercase tracking-tight text-foreground block truncate max-w-full overflow-visible">{fixture.away_team}</span>
              <AvatarStack supporters={awaySupporters} />
            </div>
          </div>
        </div>

        {/* Scorers Section */}
        {showScorers && (
          <div className="px-5 sm:px-8 pb-5 sm:pb-8 overflow-visible">
            <div className="p-3 sm:p-4 bg-muted/40 rounded-2xl sm:rounded-3xl border border-border/40 flex flex-col gap-2 shadow-inner backdrop-blur-sm overflow-visible">
               <div className="flex items-center justify-center gap-3 overflow-visible">
                 <div className="h-[1px] bg-border/40 flex-1" />
                 <div className="flex items-center gap-1.5 overflow-visible">
                    <Goal className="h-2.5 w-2.5 text-primary" />
                    <span className="premium-gold-gradient-text text-[8px] uppercase tracking-[0.2em]">Goal Events</span>
                 </div>
                 <div className="h-[1px] bg-border/40 flex-1" />
               </div>
               <div className="flex justify-between gap-4 pt-0.5 overflow-visible">
                  <div className="flex-1 min-w-0 overflow-visible">
                    {homeScorers && (
                      <p className="text-[9px] font-bold text-muted-foreground uppercase leading-tight italic break-words overflow-visible">
                        {homeScorers}
                      </p>
                    )}
                  </div>
                  <div className="flex-1 text-right min-w-0 overflow-visible">
                    {awayScorers && (
                      <p className="text-[9px] font-bold text-muted-foreground uppercase leading-tight italic break-words overflow-visible">
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
