"use client"

import { MainNav } from "@/components/layout/main-nav"
import { Zap, MessageSquare } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const MOCK_LOGS = [
  { id: 1, user: "MessiMagic", action: "predicted", match: "USA vs MEX", time: "2m", color: "text-blue-500" },
  { id: 2, user: "SIUUU", action: "updated", match: "CAN vs BRA", time: "15m", color: "text-green-500" },
  { id: 3, user: "KylianRunner", action: "earned 3pts", match: "ENG vs GER", time: "1h", color: "text-yellow-500" },
  { id: 4, user: "NeymarSkill", action: "joined", match: "WC26 Predictor", time: "3h", color: "text-purple-500" },
]

export default function Activity() {
  return (
    <div className="min-h-screen bg-gray-50 text-foreground pb-24 md:pt-20">
      <MainNav />
      <header className="p-6 border-b border-gray-100 bg-white sticky top-0 z-40">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-black italic tracking-tighter flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary fill-primary" />
            LIVE FEED
          </h1>
        </div>
      </header>

      <main className="p-4 space-y-3 max-w-2xl mx-auto mt-4">
        {MOCK_LOGS.map((log) => (
          <div key={log.id} className="flex gap-4 p-5 bg-white rounded-3xl border border-gray-100 items-center shadow-sm">
            <Avatar className="h-12 w-12 border border-gray-50">
              <AvatarFallback className="bg-gray-50 text-primary font-black text-xs">{log.user[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <p className="text-[11px] leading-relaxed">
                    <span className="font-black text-gray-900 uppercase mr-1">{log.user}</span>
                    <span className="text-gray-400 font-bold lowercase">{log.action}</span>
                  </p>
                  <p className="font-black text-primary uppercase italic text-[14px] tracking-tight">{log.match}</p>
                </div>
                <span className="text-[9px] text-gray-300 font-black uppercase bg-gray-50 px-2 py-1 rounded-full">{log.time} ago</span>
              </div>
            </div>
            <MessageSquare className="h-4 w-4 text-gray-100" />
          </div>
        ))}
      </main>
    </div>
  )
}