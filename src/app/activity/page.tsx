"use client"

import { MainNav } from "@/components/layout/main-nav"
import { Activity as ActivityIcon, User, Zap } from "lucide-react"

const MOCK_LOGS = [
  { id: 1, user: "MessiMagic", action: "predicted", match: "USA vs MEX", time: "2 mins ago" },
  { id: 2, user: "SIUUU", action: "updated", match: "CAN vs BRA", time: "15 mins ago" },
  { id: 3, user: "KylianRunner", action: "earned 3pts", match: "ENG vs GER", time: "1 hour ago" },
  { id: 4, user: "NeymarSkill", action: "joined", match: "the predictor", time: "3 hours ago" },
]

export default function Activity() {
  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <MainNav />
      <header className="p-6 bg-gradient-to-b from-yellow-500/10 to-transparent">
        <h1 className="text-3xl font-black italic tracking-tighter">ACTIVITY LOG</h1>
      </header>

      <main className="p-4 space-y-4 max-w-2xl mx-auto">
        {MOCK_LOGS.map((log) => (
          <div key={log.id} className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/5 items-center">
            <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center border border-accent/20">
              <Zap className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-sm">
                <span className="font-black text-secondary uppercase mr-1">{log.user}</span>
                <span className="text-gray-400 lowercase">{log.action}</span>
                <span className="ml-1 font-bold text-white uppercase italic">{log.match}</span>
              </p>
              <span className="text-[10px] text-gray-500 uppercase font-bold">{log.time}</span>
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
