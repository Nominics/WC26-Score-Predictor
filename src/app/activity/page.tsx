"use client"

import { MainNav } from "@/components/layout/main-nav"
import { Activity as ActivityIcon, Zap, MessageSquare } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const MOCK_LOGS = [
  { id: 1, user: "MessiMagic", action: "predicted", match: "USA vs MEX", time: "2m", color: "text-blue-500" },
  { id: 2, user: "SIUUU", action: "updated", match: "CAN vs BRA", time: "15m", color: "text-green-500" },
  { id: 3, user: "KylianRunner", action: "earned 3pts", match: "ENG vs GER", time: "1h", color: "text-yellow-500" },
  { id: 4, user: "NeymarSkill", action: "joined", match: "WC26 Predictor", time: "3h", color: "text-purple-500" },
]

export default function Activity() {
  return (
    <div className="min-h-screen bg-white text-foreground pb-24 md:pt-20">
      <MainNav />
      <header className="p-6 border-b border-gray-100 bg-white sticky top-0 z-40">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-black italic tracking-tighter flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary fill-primary" />
            LIVE FEED
          </h1>
        </div>
      </header>

      <main className="p-4 space-y-3 max-w-2xl mx-auto">
        {MOCK_LOGS.map((log) => (
          <div key={log.id} className="flex gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100 items-center">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-white border text-[10px] font-black">{log.user[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <p className="text-xs leading-relaxed">
                  <span className="font-black text-gray-900 uppercase mr-1">{log.user}</span>
                  <span className="text-gray-500 lowercase">{log.action}</span>
                  <span className="block font-black text-primary uppercase italic text-[13px]">{log.match}</span>
                </p>
                <span className="text-[9px] text-gray-400 font-bold uppercase">{log.time}</span>
              </div>
            </div>
            <MessageSquare className="h-4 w-4 text-gray-200" />
          </div>
        ))}
      </main>
    </div>
  )
}