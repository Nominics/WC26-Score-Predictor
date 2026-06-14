"use client"

import { MainNav } from "@/components/layout/main-nav"
import { RULES } from "@/lib/mock-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Info } from "lucide-react"

export default function Rules() {
  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <MainNav />
      <header className="p-6 bg-gradient-to-b from-gray-500/10 to-transparent">
        <h1 className="text-3xl font-black italic tracking-tighter">THE RULES</h1>
      </header>

      <main className="p-4 space-y-4 max-w-2xl mx-auto">
        <Card className="bg-secondary/10 border-secondary/20">
          <CardHeader className="flex flex-row items-center gap-2">
            <Info className="text-secondary h-6 w-6"/>
            <CardTitle className="text-secondary font-black">HOW TO PLAY</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-gray-300">Submit your predictions for each match. Points are awarded based on how close your prediction is to the final result after 90 minutes (plus injury time).</p>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {RULES.map((rule, i) => (
            <div key={i} className="p-6 bg-white/5 rounded-2xl border border-white/10 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black italic text-white mb-1">{rule.title}</h3>
                <p className="text-xs text-gray-400 uppercase tracking-tight">{rule.description}</p>
              </div>
              <div className="text-right">
                <span className="text-4xl font-black italic text-secondary">+{rule.points}</span>
                <p className="text-[10px] font-bold text-secondary uppercase">points</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-accent/10 border border-accent/20 rounded-xl text-center">
            <p className="text-[10px] text-accent font-black uppercase italic tracking-widest">Prediction window closes 15 minutes after kickoff</p>
        </div>
      </main>
    </div>
  )
}
