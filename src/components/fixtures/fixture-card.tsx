"use client"

import { useState, useEffect } from "react"
import { Fixture } from "@/lib/mock-data"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Lock, Edit2, Check, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { format, isAfter, addMinutes } from "date-fns"
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
  const [isLocked, setIsLocked] = useState(false)

  useEffect(() => {
    const matchTime = new Date(fixture.date)
    const lockTime = addMinutes(matchTime, 15)
    setIsLocked(isAfter(new Date(), lockTime))
  }, [fixture.date])

  const handleSave = () => {
    const h = parseInt(hScore)
    const a = parseInt(aScore)
    if (!isNaN(h) && !isNaN(a)) {
      onSave(fixture.id, h, a)
      setEditing(false)
    }
  }

  const isCompleted = fixture.status === 'finished'

  return (
    <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow bg-white rounded-3xl">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-primary uppercase tracking-wider">{fixture.group}</span>
            <span className="text-[10px] font-bold text-gray-400">{format(new Date(fixture.date), "EEEE, d MMM · HH:mm")}</span>
          </div>
          {isLocked ? (
             <Badge variant="outline" className="text-[8px] uppercase border-gray-100 text-gray-400 gap-1 rounded-full"><Lock className="h-2 w-2"/> Locked</Badge>
          ) : (
             <Badge className="bg-secondary/10 text-secondary border-none text-[8px] uppercase rounded-full">Open</Badge>
          )}
        </div>

        <div className="grid grid-cols-3 items-center gap-2 py-2">
          {/* Home Team */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
              {fixture.homeTeam.flag}
            </div>
            <span className="text-[11px] font-black uppercase text-center line-clamp-1">{fixture.homeTeam.name}</span>
          </div>

          {/* Predict Area */}
          <div className="flex flex-col items-center justify-center">
            {editing && !isLocked ? (
              <div className="flex items-center gap-1">
                <input 
                  type="number" 
                  value={hScore} 
                  onChange={(e) => setHScore(e.target.value)}
                  className="w-10 h-10 text-center text-xl font-black bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                  autoFocus
                />
                <span className="text-gray-300 font-bold">-</span>
                <input 
                  type="number" 
                  value={aScore} 
                  onChange={(e) => setAScore(e.target.value)}
                  className="w-10 h-10 text-center text-xl font-black bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-3">
                  <span className={cn("text-3xl font-black", initialHome === undefined ? "text-gray-200" : "text-black")}>
                    {initialHome ?? '-'}
                  </span>
                  <span className="text-gray-300 font-black">-</span>
                  <span className={cn("text-3xl font-black", initialAway === undefined ? "text-gray-200" : "text-black")}>
                    {initialAway ?? '-'}
                  </span>
                </div>
                {initialHome === undefined && !isLocked && !editing && (
                  <span className="text-[9px] font-black text-secondary animate-pulse uppercase">Predict now</span>
                )}
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
              {fixture.awayTeam.flag}
            </div>
            <span className="text-[11px] font-black uppercase text-center line-clamp-1">{fixture.awayTeam.name}</span>
          </div>
        </div>

        <div className="mt-6 flex justify-between items-center border-t border-gray-50 pt-3">
          <div className="flex items-center gap-1 text-[9px] text-gray-400 uppercase font-black">
            <span className="bg-gray-100 px-2 py-0.5 rounded-full">{fixture.venue}</span>
          </div>
          
          {!isLocked && (
            editing ? (
              <Button size="sm" onClick={handleSave} className="bg-primary text-white font-black uppercase text-[10px] h-8 rounded-xl px-4">
                <Check className="h-3 w-3 mr-1"/> Confirm
              </Button>
            ) : (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setEditing(true)} 
                className="text-primary hover:bg-primary/5 font-black uppercase text-[10px] h-8 rounded-xl"
              >
                {initialHome !== undefined ? <Edit2 className="h-3 w-3 mr-1"/> : 'Set Score'}
              </Button>
            )
          )}
          
          {isCompleted && (
             <div className="bg-primary/5 text-primary text-[10px] font-black px-3 py-1 rounded-full uppercase">
               Final: {fixture.homeScore}-{fixture.awayScore}
             </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}