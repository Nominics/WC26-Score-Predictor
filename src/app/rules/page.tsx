
"use client"

import { MainNav } from "@/components/layout/main-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Info, Award, Calendar, Zap } from "lucide-react"

const RULES = [
  { title: "Exact Score", points: 3, description: "Predict the exact final score of the match.", icon: Award },
  { title: "Correct Result", points: 1, description: "Predict the correct winner or a draw outcome.", icon: Zap },
  { title: "Time Limit", points: 0, description: "Predictions lock 15 minutes after kickoff.", icon: Calendar },
];

export default function Rules() {
  return (
    <div className="min-h-screen bg-gray-50 text-foreground pb-24">
      <MainNav />
      <header className="p-8 bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-black italic tracking-tighter">THE RULES</h1>
          <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-1">Arena Guidelines</p>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-2xl mx-auto mt-6">
        <Card className="bg-white border border-gray-100 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="flex flex-row items-center gap-3 bg-gray-50/50 p-6">
            <div className="bg-primary/10 p-2 rounded-xl">
              <Info className="text-primary h-5 w-5"/>
            </div>
            <CardTitle className="text-gray-900 font-black italic uppercase tracking-tight text-lg">How Scoring Works</CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-sm text-gray-500 font-medium leading-relaxed">
            Points are calculated automatically after each match is finalized in the official Arena Sync. Your leaderboard rank updates live based on these scores.
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {RULES.map((rule, i) => (
            <div key={i} className="p-6 bg-white rounded-3xl border border-gray-100 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-4">
                <div className="bg-gray-50 p-3 rounded-2xl">
                    <rule.icon className="h-5 w-5 text-gray-400" />
                </div>
                <div className="space-y-0.5">
                    <h3 className="text-lg font-black italic text-gray-900 uppercase tracking-tight">{rule.title}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{rule.description}</p>
                </div>
              </div>
              {rule.points > 0 && (
                <div className="text-right">
                    <span className="text-4xl font-black italic text-primary leading-none">+{rule.points}</span>
                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">points</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-5 bg-primary/5 border border-primary/10 rounded-3xl text-center">
            <p className="text-[10px] text-primary font-black uppercase italic tracking-[0.2em]">Prediction window closes 15 mins after kickoff</p>
        </div>
      </main>
    </div>
  )
}
