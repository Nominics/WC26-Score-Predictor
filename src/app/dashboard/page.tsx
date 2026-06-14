"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { MainNav } from "@/components/layout/main-nav"
import { FIXTURES, MOCK_PREDICTIONS } from "@/lib/mock-data"
import { FixtureCard } from "@/components/fixtures/fixture-card"
import { useToast } from "@/hooks/use-toast"

export default function Dashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [predictions, setPredictions] = useState(MOCK_PREDICTIONS)

  const handlePredict = (fId: string, h: number, a: number) => {
    const existing = predictions.find(p => p.fixtureId === fId && p.userId === user?.id)
    if (existing) {
      setPredictions(predictions.map(p => 
        p.fixtureId === fId && p.userId === user?.id ? { ...p, homeScore: h, awayScore: a, updatedAt: new Date().toISOString() } : p
      ))
    } else {
      setPredictions([...predictions, { fixtureId: fId, userId: user?.id, homeScore: h, awayScore: a, updatedAt: new Date().toISOString() }])
    }
    toast({
      title: "Prediction Saved!",
      description: "Good luck with your score.",
    })
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <MainNav />
      <header className="p-6 bg-gradient-to-b from-secondary/10 to-transparent">
        <h1 className="text-3xl font-black italic tracking-tighter">FIXTURES</h1>
        <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mt-1">Predict and win points</p>
      </header>

      <main className="p-4 space-y-4 max-w-2xl mx-auto">
        {FIXTURES.map((fixture) => {
          const pred = predictions.find(p => p.fixtureId === fixture.id && p.userId === user?.id)
          return (
            <FixtureCard 
              key={fixture.id} 
              fixture={fixture} 
              initialHome={pred?.homeScore}
              initialAway={pred?.awayScore}
              onSave={handlePredict}
            />
          )
        })}
      </main>
    </div>
  )
}
