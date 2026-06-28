
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit2, Check, Lock, Trophy, Zap, Timer, Goal, Star, ChevronDown, ChevronUp, Users, ShieldAlert, Target } from "lucide-react"
import { cn } from "@/lib/utils"
import { DateTime } from "luxon"
import Image from "next/image"
import { UserAvatar } from "@/components/user-avatar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"

const APP_ZONE = "Indian/Maldives"

interface FixtureCardProps {
  fixture: any
  myPrediction?: any
  onSave: (id: string, h: number, a: number, isLifeline: boolean, scorerName?: string) => void
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
    <div className="flex -space-x-1.5 overflow-visible py-1">
      {visibleSupporters.map((s, idx) => (
        <div key={`${s.user_id}-${idx}`} className="inline-block ring-1.5 ring-background rounded-full transition-transform hover:-translate-y-0.5 shadow-sm overflow-visible">
          <UserAvatar profile={s} className="h-5 w-5 sm:h-5 sm:w-5 border-0" />
        </div>
      ))}
      {remainingCount > 0 && (
        <div className="flex h-5 w-5 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-muted ring-1.5 ring-background shadow-sm overflow-visible">
          <span className="premium-gold-gradient-number text-[7px] sm:text-[8px]">+{remainingCount}</span>
        </div>
      )}
    </div>
  )
}

export function FixtureCard({ 
  fixture, 
  myPrediction,
  onSave, 
  lifelinesRemaining = 0,
  userProfile,
  supporters = [],
  currentUserId
}: FixtureCardProps) {
  const [hScore, setHScore] = useState<string>("")
  const [aScore, setAScore] = useState<string>("")
  const [scorerName, setScorerName] = useState<string>("")
  const [editing, setEditing] = useState(false)
  const [isStandardLocked, setIsStandardLocked] = useState(false)
  const [isLifelineAvailable, setIsLifelineAvailable] = useState(false)
  const [isTotalLocked, setIsTotalLocked] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isBeforeKickoff, setIsBeforeKickoff] = useState(true)

  // Strictly sync state with props when props change
  useEffect(() => {
    if (myPrediction) {
      setHScore(myPrediction.predicted_home_score?.toString() || "0")
      setAScore(myPrediction.predicted_away_score?.toString() || "0")
      setScorerName(myPrediction.predicted_scorer_name || "")
    } else {
      setHScore("")
      setAScore("")
      setScorerName("")
    }
  }, [myPrediction])

  const kickoff = DateTime.fromISO(fixture.kickoff_at).setZone(APP_ZONE)
  const timeStr = kickoff.isValid ? kickoff.toFormat('HH:mm') : 'TBD'
  const dateStr = kickoff.isValid ? kickoff.toFormat('LLL dd') : ''

  useEffect(() => {
    const checkLock = () => {
      const now = DateTime.now()
      const kickoffTime = DateTime.fromISO(fixture.kickoff_at)
      const standardLock = kickoffTime.plus({ minutes: 15 })
      const lifelineLock = kickoffTime.plus({ minutes: 50 })
      
      const finished = fixture.status === 'finished'
      
      setIsBeforeKickoff(now < kickoffTime)
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
      onSave(fixture.id, h, a, isLifeline, isBeforeKickoff ? scorerName : undefined)
      setEditing(false)
    }
  }

  const isLive = fixture.status === 'live'
  const isFinished = fixture.status === 'finished'

  const homeSupporters = supporters.filter(s => s.prediction_side === 'home')
  const awaySupporters = supporters.filter(s => s.prediction_side === 'away')
  const drawSupporters = supporters.filter(s => s.prediction_side === 'draw')

  // Fairness rule: Only see scores if you predicted OR the match is locked
  const canSeeScores = isStandardLocked || !!myPrediction;

  const groupedPredictions = useMemo(() => {
    return {
      home: supporters.filter(s => s.predicted_home_score > s.predicted_away_score),
      draw: supporters.filter(s => s.predicted_home_score === s.predicted_away_score),
      away: supporters.filter(s => s.predicted_home_score < s.predicted_away_score),
    }
  }, [supporters])

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
      "relative isolate overflow-visible border-amber-200/60 dark:border-border/50 bg-white dark:bg-card text-foreground transition-all duration-500 rounded-[2rem]",
      isLive ? "ring-2 ring-emerald-500/50" : "shadow-xl shadow-amber-900/5 dark:shadow-none"
    )}>
      <div className={cn(
        "absolute inset-0 rounded-[inherit] pointer-events-none transition-opacity duration-1000 opacity-10 dark:opacity-40",
        isLive 
          ? "bg-gradient-to-br from-emerald-500 via-transparent to-teal-500 opacity-10" 
          : isFinished
            ? "bg-gradient-to-br from-zinc-500 via-transparent to-orange-500"
            : "bg-gradient-to-br from-indigo-500 via-transparent to-purple-500"
      )} />
      
      <CardContent className="p-0 relative z-10 overflow-visible">
        <div className="px-5 py-3 flex justify-between items-center border-b border-amber-100 dark:border-border/50 bg-amber-50/40 dark:bg-background/40 backdrop-blur-md rounded-t-[inherit] overflow-visible">
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

        <div className="p-4 sm:p-6 pb-2 sm:pb-4 flex items-center justify-between gap-1 sm:gap-2 overflow-visible">
          <div className="flex flex-col items-center flex-1 text-center min-w-0 gap-2 sm:gap-3 overflow-visible">
            <div className="relative group/flag overflow-visible">
              {fixture.home_flag ? (
                <div className="relative h-14 w-14 sm:h-20 sm:w-20 transition-transform duration-500 overflow-visible">
                  <div className="absolute inset-0 rounded-full bg-background/50 backdrop-blur-sm border border-border shadow-md" />
                  <div className="relative h-full w-full rounded-full overflow-hidden p-0.5 sm:p-1">
                    <Image src={fixture.home_flag} alt={fixture.home_team} fill className="rounded-full object-cover" />
                  </div>
                </div>
              ) : (
                <div className="flex h-14 w-14 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-muted border border-border text-[8px] font-black text-muted-foreground uppercase italic">TBD</div>
              )}
            </div>
            <div className="space-y-1 w-full flex flex-col items-center overflow-visible">
              <span className="text-[11px] sm:text-sm font-black uppercase tracking-tight text-foreground block truncate max-w-full overflow-visible">{fixture.home_team}</span>
              <AvatarStack supporters={homeSupporters} />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center min-w-[100px] sm:min-w-[140px] overflow-visible">
            {editing ? (
              <div className="flex flex-col items-center gap-3 py-1 animate-in zoom-in-95 duration-200 overflow-visible w-full">
                <div className="flex items-center gap-2 overflow-visible">
                  <input type="number" value={hScore} onChange={(e) => setHScore(e.target.value)} className="w-10 h-12 sm:w-14 sm:h-16 text-center text-xl sm:text-3xl font-black bg-muted border-2 border-primary/50 text-foreground rounded-xl sm:rounded-2xl outline-none" autoFocus />
                  <span className="text-xl sm:text-3xl font-black text-muted-foreground italic">:</span>
                  <input type="number" value={aScore} onChange={(e) => setAScore(e.target.value)} className="w-10 h-12 sm:w-14 sm:h-16 text-center text-xl sm:text-3xl font-black bg-muted border-2 border-primary/50 text-foreground rounded-xl sm:rounded-2xl outline-none" />
                </div>

                {isBeforeKickoff ? (
                  <div className="w-full space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center block">Predict Scorer</label>
                    <Input 
                      placeholder="Player Name"
                      value={scorerName}
                      onChange={(e) => setScorerName(e.target.value)}
                      className="h-9 rounded-xl text-center font-bold text-xs bg-muted/50 border-primary/20"
                    />
                    <p className="text-[7px] font-bold text-muted-foreground/60 text-center uppercase tracking-tighter italic">Optional · Locks at Kickoff</p>
                  </div>
                ) : myPrediction?.predicted_scorer_name && (
                  <div className="w-full text-center">
                    <p className="text-[9px] font-black uppercase tracking-widest text-primary italic leading-none">Scorer Pick Locked</p>
                    <p className="text-[10px] font-bold text-foreground mt-1 truncate">{myPrediction.predicted_scorer_name}</p>
                  </div>
                )}

                <Button onClick={() => handleSave(isStandardLocked)} className="soft-button h-10 px-5 sm:h-12 sm:px-8 premium-gold-pill text-[10px] sm:text-xs">
                  <Check className="h-3 w-3 mr-1.5" /> LOCK PICK
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center overflow-visible">
                <div className={cn(
                  "relative flex items-center justify-center min-w-[110px] sm:min-w-[160px] min-h-[70px] sm:min-h-[76px] px-6 sm:px-8 py-3 rounded-[1.8rem] sm:rounded-[2rem] border border-amber-200/60 dark:border-white/10 shadow-[0_12px_30px_rgba(120,80,20,0.12)] dark:shadow-inner bg-white/90 dark:bg-black/45 overflow-visible",
                  isLive ? "ring-1 ring-emerald-500/20" : ""
                )}>
                  <span className="inline-block premium-gold-gradient-number text-[54px] sm:text-6xl font-black italic tracking-tighter tabular-nums leading-[1.18] pt-1 pb-1 overflow-visible">
                    {isFinished || isLive ? (fixture.home_score ?? 0) : '0'}
                  </span>
                  <span className="inline-block mx-2 text-[42px] sm:text-5xl font-black leading-[1.18] text-slate-400/60 dark:text-white/25 pt-1 pb-1">:</span>
                  <span className="inline-block premium-gold-gradient-number text-[54px] sm:text-6xl font-black italic tracking-tighter tabular-nums leading-[1.18] pt-1 pb-1 overflow-visible">
                    {isFinished || isLive ? (fixture.away_score ?? 0) : '0'}
                  </span>
                </div>
                
                <div className="mt-2 flex flex-col items-center overflow-visible w-full">
                  <div className="flex flex-col items-center gap-1.5 w-full overflow-visible">
                    <AvatarStack supporters={drawSupporters} />
                    
                    {myPrediction && (
                      <div className="flex flex-col items-center gap-1.5 overflow-visible w-full">
                        <div className="rounded-full bg-primary/5 dark:bg-primary/10 border border-primary/20 px-3 py-1 flex items-center gap-1.5 shadow-sm overflow-visible animate-in fade-in slide-in-from-top-1 duration-300">
                          <Zap className="h-2.5 w-2.5 text-primary fill-primary" />
                          <div className="flex items-center gap-1 overflow-visible">
                            <span className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-tighter">Your Pick:</span>
                            <span className="premium-gold-gradient-number text-[10px] sm:text-[11px] whitespace-nowrap overflow-visible">
                              {myPrediction.predicted_home_score} - {myPrediction.predicted_away_score}
                            </span>
                          </div>
                        </div>

                        {myPrediction.predicted_scorer_name && (
                          <div className="flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-full border border-border/30 animate-in fade-in zoom-in-95 duration-500">
                            <Target className="h-2 w-2 text-primary/70" />
                            <span className="text-[8px] font-black uppercase italic text-muted-foreground tracking-tight">Scorer:</span>
                            <span className="text-[8px] font-bold text-foreground truncate max-w-[80px]">{myPrediction.predicted_scorer_name}</span>
                            {myPrediction.scorer_prediction_status === 'correct' && (
                              <Star className="h-2 w-2 text-yellow-500 fill-yellow-500 ml-0.5" />
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-2 flex flex-col items-center overflow-visible">
                    {!editing && (
                       !isStandardLocked ? (
                          <Button onClick={() => setEditing(true)} className="soft-button h-8 px-4 sm:h-10 sm:px-6 bg-muted dark:bg-muted text-foreground border border-border/50 text-[9px] sm:text-[10px] hover:premium-gold-gradient-bg hover:text-black transition-all">
                            <Edit2 className="h-2.5 w-2.5 mr-1.5" /> {myPrediction ? 'Edit Pick' : 'Make Pick'}
                          </Button>
                       ) : isLifelineAvailable ? (
                          <Button onClick={() => setEditing(true)} className="soft-button h-8 px-4 premium-gold-pill text-[9px] shadow-lg animate-pulse">
                            <Zap className="h-3 w-3 fill-current mr-1" /> Use Lifeline
                          </Button>
                       ) : null
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center flex-1 text-center min-w-0 gap-2 sm:gap-3 overflow-visible">
            <div className="relative group/flag overflow-visible">
              {fixture.away_flag ? (
                <div className="relative h-14 w-14 sm:h-20 sm:w-20 transition-transform duration-500 overflow-visible">
                  <div className="absolute inset-0 rounded-full bg-background/50 backdrop-blur-sm border border-border shadow-md" />
                  <div className="relative h-full w-full rounded-full overflow-hidden p-0.5 sm:p-1">
                    <Image src={fixture.away_flag} alt={fixture.away_team} fill className="rounded-full object-cover" />
                  </div>
                </div>
              ) : (
                <div className="flex h-14 w-14 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-muted border border-border text-[8px] font-black text-muted-foreground uppercase italic">TBD</div>
              )}
            </div>
            <div className="space-y-1 w-full flex flex-col items-center overflow-visible">
              <span className="text-[11px] sm:text-sm font-black uppercase tracking-tight text-foreground block truncate max-w-full overflow-visible">{fixture.away_team}</span>
              <AvatarStack supporters={awaySupporters} />
            </div>
          </div>
        </div>

        {showScorers && (
          <div className="px-5 sm:px-8 pb-3 sm:pb-4 overflow-visible">
            <div className="p-3 sm:p-4 bg-amber-50/30 dark:bg-muted/40 rounded-2xl sm:rounded-3xl border border-amber-100/50 dark:border-border/40 flex flex-col gap-2 shadow-inner backdrop-blur-sm overflow-visible">
               <div className="flex items-center justify-center gap-3 overflow-visible">
                 <div className="h-[1px] bg-amber-200/30 dark:bg-border/40 flex-1" />
                 <div className="flex items-center gap-1.5 overflow-visible">
                    <Goal className="h-2.5 w-2.5 text-primary" />
                    <span className="premium-gold-gradient-text text-[8px] uppercase tracking-[0.2em]">Goal Events</span>
                 </div>
                 <div className="h-[1px] bg-amber-200/30 dark:bg-border/40 flex-1" />
               </div>
               <div className="flex justify-between gap-4 pt-0.5 overflow-visible">
                  <div className="flex-1 min-w-0 overflow-visible">
                    {homeScorers && (
                      <p className="text-[9px] font-bold text-muted-foreground uppercase leading-tight italic break-words overflow-visible">
                        {homeScorers}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-1 min-w-0 overflow-visible">
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

        {/* Expandable Community Predictions */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="overflow-visible">
          <div className="px-5 pb-5 pt-2 flex flex-col items-center overflow-visible">
             <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-4 rounded-full bg-amber-50/50 dark:bg-muted/50 hover:bg-amber-100/50 dark:hover:bg-muted text-[9px] font-black uppercase tracking-widest flex items-center gap-2 group transition-all border border-amber-100/30 dark:border-transparent"
                >
                  <Users className="h-3 w-3 text-primary" />
                  <span>{isExpanded ? 'Hide Picks' : `View All Picks (${supporters.length})`}</span>
                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3 group-hover:translate-y-0.5 transition-transform" />}
                </Button>
             </CollapsibleTrigger>

             <CollapsibleContent className="w-full mt-6 space-y-6 overflow-visible animate-in slide-in-from-top-2 duration-300">
                {!canSeeScores ? (
                  <div className="py-12 px-6 rounded-[2rem] bg-amber-50/20 dark:bg-muted/30 border-2 border-dashed border-amber-200/50 dark:border-primary/20 flex flex-col items-center text-center gap-4">
                     <ShieldAlert className="h-8 w-8 text-primary opacity-50" />
                     <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground leading-relaxed">
                       Submit your pick to reveal<br/>how others are voting
                     </p>
                  </div>
                ) : supporters.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-[10px] font-black uppercase text-muted-foreground/40 tracking-widest">No picks submitted yet</p>
                  </div>
                ) : (
                  <div className="space-y-8 overflow-visible">
                    {/* Home Win Group */}
                    {groupedPredictions.home.length > 0 && (
                      <div className="space-y-3 overflow-visible">
                        <div className="flex items-center gap-3 px-1 overflow-visible">
                          <span className="premium-gold-gradient-heading text-[10px] uppercase">{fixture.home_team} Win</span>
                          <div className="h-[1px] bg-amber-200/20 dark:bg-border/40 flex-1" />
                          <span className="text-[9px] font-black text-muted-foreground opacity-40 uppercase tracking-tighter">{groupedPredictions.home.length} Fan{groupedPredictions.home.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="grid gap-2 overflow-visible">
                          {groupedPredictions.home.map((s) => (
                            <PredictionRow key={s.user_id} supporter={s} isOwn={s.user_id === currentUserId} isFinished={isFinished} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Draw Group */}
                    {groupedPredictions.draw.length > 0 && (
                      <div className="space-y-3 overflow-visible">
                        <div className="flex items-center gap-3 px-1 overflow-visible">
                          <span className="premium-gold-gradient-heading text-[10px] uppercase italic">The Draw</span>
                          <div className="h-[1px] bg-amber-200/20 dark:bg-border/40 flex-1" />
                          <span className="text-[9px] font-black text-muted-foreground opacity-40 uppercase tracking-tighter">{groupedPredictions.draw.length} Fan{groupedPredictions.draw.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="grid gap-2 overflow-visible">
                          {groupedPredictions.draw.map((s) => (
                            <PredictionRow key={s.user_id} supporter={s} isOwn={s.user_id === currentUserId} isFinished={isFinished} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Away Win Group */}
                    {groupedPredictions.away.length > 0 && (
                      <div className="space-y-3 overflow-visible">
                        <div className="flex items-center gap-3 px-1 overflow-visible">
                          <span className="premium-gold-gradient-heading text-[10px] uppercase">{fixture.away_team} Win</span>
                          <div className="h-[1px] bg-amber-200/20 dark:bg-border/40 flex-1" />
                          <span className="text-[9px] font-black text-muted-foreground opacity-40 uppercase tracking-tighter">{groupedPredictions.away.length} Fan{groupedPredictions.away.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="grid gap-2 overflow-visible">
                          {groupedPredictions.away.map((s) => (
                            <PredictionRow key={s.user_id} supporter={s} isOwn={s.user_id === currentUserId} isFinished={isFinished} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
             </CollapsibleContent>
          </div>
        </Collapsible>
      </CardContent>
    </Card>
  )
}

function PredictionRow({ supporter, isOwn, isFinished }: { supporter: any, isOwn: boolean, isFinished: boolean }) {
  const hasScorer = !!supporter.predicted_scorer_name;
  const isReviewed = supporter.scorer_prediction_status !== 'pending';

  return (
    <div className={cn(
      "flex flex-col p-3 rounded-2xl border transition-all overflow-visible gap-2",
      isOwn 
        ? "bg-primary/10 border-primary/30 premium-gold-ring shadow-lg scale-[1.02]" 
        : "bg-white/40 dark:bg-muted/30 border-amber-100/50 dark:border-border/40"
    )}>
      {/* Identity and Score Line */}
      <div className="flex items-center justify-between gap-2 overflow-visible">
        <div className="flex items-center gap-2.5 overflow-visible min-w-0">
          <UserAvatar profile={supporter} className="h-7 w-7 border-0 shadow-sm shrink-0" />
          <div className="flex flex-col overflow-visible min-w-0">
             <span className={cn(
               "text-[10px] sm:text-[11px] font-black uppercase tracking-tight leading-none truncate",
               isOwn ? "premium-gold-gradient-heading" : "text-foreground/80"
             )}>
               {supporter.display_name} {isOwn && <span className="text-[8px] italic opacity-60">(YOU)</span>}
             </span>
             {isFinished && (
               <span className={cn(
                 "text-[7px] sm:text-[8px] font-bold uppercase mt-0.5 leading-none",
                 (supporter.points || 0) > 0 ? "text-emerald-500" : "text-muted-foreground/40"
               )}>
                 {(supporter.points || 0) > 0 ? `+${supporter.points} Score Bonus` : 'Score 0 pts'}
               </span>
             )}
          </div>
        </div>

        <div className="px-2.5 py-0.5 rounded-full bg-white/60 dark:bg-background/50 border border-amber-100/50 dark:border-border/50 shadow-inner overflow-visible shrink-0">
           <span className="premium-gold-gradient-number text-[11px] sm:text-[12px] tabular-nums whitespace-nowrap overflow-visible">
             {supporter.predicted_home_score} - {supporter.predicted_away_score}
           </span>
        </div>
      </div>

      {/* Scorer Prediction Line */}
      <div className="flex items-center justify-between gap-2 px-1 border-t border-amber-100/20 dark:border-border/20 pt-2 mt-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <Target className={cn("h-2.5 w-2.5", hasScorer ? "text-primary/70" : "text-muted-foreground/20")} />
          {hasScorer ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[9px] font-bold text-foreground/70 truncate uppercase italic tracking-tighter">
                {supporter.predicted_scorer_name}
              </span>
              
              {/* Status Pills for finished matches or non-pending status */}
              {(isFinished || isReviewed) && (
                <div className="flex items-center gap-1 shrink-0">
                  {supporter.scorer_prediction_status === 'correct' ? (
                    <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <Star className="h-2 w-2 text-emerald-500 fill-emerald-500" />
                      <span className="text-[7px] font-black text-emerald-500 uppercase">+{supporter.scorer_prediction_points || 2} PTS</span>
                    </div>
                  ) : supporter.scorer_prediction_status === 'incorrect' ? (
                    <div className="bg-muted/50 px-2 py-0.5 rounded-full border border-border/30">
                      <span className="text-[7px] font-black text-muted-foreground/40 uppercase">Incorrect</span>
                    </div>
                  ) : (
                    <div className="bg-amber-500/5 px-2 py-0.5 rounded-full border border-amber-500/10">
                      <span className="text-[7px] font-black text-amber-500/60 uppercase italic animate-pulse">Pending Review</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <span className="text-[8px] font-bold uppercase text-muted-foreground/20 italic tracking-tighter">No Scorer Pick</span>
          )}
        </div>
      </div>
    </div>
  )
}
