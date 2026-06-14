"use client"

import { useState, useEffect } from "react"
import { Fixture } from "@/lib/mock-data"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Lock, Edit2, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { format, isAfter, addMinutes } from "date-fns"

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
  const [isLocked, setIsLocked] = useState(false)

  useEffect(() => {
    const matchTime = new Date(fixture.date)
    const lockTime = addMinutes(matchTime, 15)
    setIsLocked(isAfter(new Date(), lockTime))
  }, [fixture.date])

  const handleSave = () => {
    onSave(fixture.id, parseInt(hScore), parseInt(aScore))
    setEditing(false)
  }

  const isCompleted = fixture.status === 'finished'

  return (
    <Card className="overflow-hidden border-white/10 bg-white/5">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{fixture.group}</span>
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-bold text-gray-400">{format(new Date(fixture.date), "MMM d, HH:mm")}</span>
             {isLocked ? (
                <Badge variant="destructive" className="text-[9px] uppercase"><Lock className="h-2 w-2 mr-1"/> Locked</Badge>
             ) : (
                <Badge className="bg-secondary text-primary text-[9px] uppercase">Open</Badge>
             )}
          </div>
        </div>

        <div className="grid grid-cols-3 items-center gap-4 py-2">
          {/* Home Team */}
          <div className="flex flex-col items-center text-center gap-2">
            <span className="text-3xl">{fixture.homeTeam.flag}</span>
            <span className="text-xs font-black uppercase tracking-tight line-clamp-1">{fixture.homeTeam.name}</span>
          </div>

          {/* Scores */}
          <div className="flex items-center justify-center gap-2">
            {editing && !isLocked ? (
              <div className="flex items-center gap-1">
                <Input 
                  type="number" 
                  value={hScore} 
                  onChange={(e) => setHScore(e.target.value)}
                  className="w-12 h-12 text-center text-xl font-bold bg-white/10 border-secondary"
                />
                <span className="text-white font-bold">:</span>
                <Input 
                  type="number" 
                  value={aScore} 
                  onChange={(e) => setAScore(e.target.value)}
                  className="w-12 h-12 text-center text-xl font-bold bg-white/10 border-secondary"
                />
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="text-3xl font-black text-white">{initialHome ?? '-'}</div>
                <div className="text-xl font-bold text-muted-foreground">:</div>
                <div className="text-3xl font-black text-white">{initialAway ?? '-'}</div>
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center text-center gap-2">
            <span className="text-3xl">{fixture.awayTeam.flag}</span>
            <span className="text-xs font-black uppercase tracking-tight line-clamp-1">{fixture.awayTeam.name}</span>
          </div>
        </div>

        <div className="mt-4 flex justify-between items-end">
          <div className="text-[10px] text-muted-foreground uppercase font-bold">{fixture.venue}</div>
          {!isLocked && (
            editing ? (
              <Button size="sm" onClick={handleSave} className="bg-secondary text-primary font-bold">
                <Check className="h-4 w-4 mr-1"/> Save
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="text-secondary hover:bg-secondary/10">
                <Edit2 className="h-4 w-4 mr-1"/> {initialHome !== undefined ? 'Edit' : 'Predict'}
              </Button>
            )
          )}
          {isCompleted && (
             <div className="text-[10px] bg-accent/20 text-accent font-bold px-2 py-1 rounded uppercase">Final: {fixture.homeScore}-{fixture.awayScore}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
