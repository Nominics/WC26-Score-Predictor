
"use client"

import { MainNav } from "@/components/layout/main-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Info, Award, Calendar, Zap, ShieldAlert, Sparkles, Flag, Share2 } from "lucide-react"
import { ProfileSheet } from "@/components/profile/profile-sheet"
import { PwaInstallButton } from "@/components/pwa-install-button"
import { cn, copyToClipboard } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

const RULES = [
  { title: "Exact Score", points: 3, description: "Predict the exact final score of the match.", icon: Award },
  { title: "Correct Result", points: 1, description: "Predict the correct winner or a draw outcome.", icon: Zap },
  { title: "Time Limit", points: 0, description: "Standard lock: 15 minutes after kickoff.", icon: Calendar },
  { title: "Lifeline usage", points: 0, description: "Use 1 of 5 lifelines to update picks until the 50th minute.", icon: ShieldAlert },
  { title: "National Pride", points: 0, description: "Choose a favorite team to represent in the standings.", icon: Flag },
];

export default function Rules() {
  const { toast } = useToast()

  const handleInvite = async () => {
    const shareUrl = window.location.origin
    const success = await copyToClipboard(shareUrl)
    if (success) {
      toast({
        title: "Link Copied!",
        description: "Share this link with your friends to invite them.",
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-foreground pb-24">
      <MainNav />
      <header className="px-6 py-4 bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex justify-between items-center h-14">
          <div>
            <h1 className="text-xl font-black italic tracking-tighter text-gray-900 uppercase leading-none">
              THE <span className="text-primary">RULES</span>
            </h1>
            <p className="text-[8px] text-gray-400 uppercase font-black tracking-widest mt-1">Arena Guidelines</p>
          </div>
          <div className="flex items-center gap-2">
            <PwaInstallButton />
            <ProfileSheet />
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-2xl mx-auto mt-6">
        <Card className="bg-white border border-gray-100 shadow-xl rounded-3xl overflow-hidden">
          <CardHeader className="flex flex-row items-center gap-3 bg-gray-50/50 p-6">
            <div className="bg-primary/10 p-2 rounded-xl">
                <Info className="text-primary h-5 w-5"/>
            </div>
            <CardTitle className="text-gray-900 font-black italic uppercase tracking-tight text-lg">How Scoring Works</CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-sm text-gray-500 font-medium leading-relaxed">
            Points are calculated automatically after each match is finalized. Your leaderboard rank updates live.
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {RULES.map((rule, i) => (
            <div key={i} className="p-6 bg-white rounded-3xl border border-gray-100 flex justify-between items-center shadow-lg transition-transform hover:scale-[1.01]">
              <div className="flex items-center gap-4">
                <div className="bg-gray-50 p-3 rounded-2xl">
                    <rule.icon className={cn("h-5 w-5", rule.title === "Lifeline usage" ? "text-yellow-500" : rule.title === "National Pride" ? "text-primary" : "text-gray-400")} />
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

        <Card className="bg-white border border-gray-100 shadow-xl rounded-3xl overflow-hidden">
          <CardHeader className="flex flex-row items-center gap-3 bg-primary/5 p-6">
            <div className="bg-primary/10 p-2 rounded-xl">
                <Flag className="text-primary h-5 w-5"/>
            </div>
            <CardTitle className="text-gray-900 font-black italic uppercase tracking-tight text-lg">National Representation</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            <p className="text-sm font-medium leading-relaxed text-gray-500">
              Personalize your Arena profile by selecting a National Team in your profile settings. 
            </p>
            <div className="bg-gray-50 rounded-2xl p-4 text-[11px] font-bold uppercase tracking-tight text-gray-600 leading-normal border border-gray-100">
              Once selected, your nation's flag will serve as your official avatar on the Global Leaderboard and in the Live Activity Feed. Show your colors as you climb the ranks!
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-600 text-white shadow-xl rounded-3xl overflow-hidden border-0">
          <CardHeader className="flex flex-row items-center gap-3 bg-white/10 p-6">
            <div className="bg-white/20 p-2 rounded-xl">
                <Sparkles className="text-white h-5 w-5"/>
            </div>
            <CardTitle className="text-white font-black italic uppercase tracking-tight text-lg">Late Join Bonus</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <p className="text-sm font-medium leading-relaxed text-blue-50">
              Players who join after the tournament has started may receive a one-time starting bonus.
            </p>
            <div className="bg-white/10 rounded-2xl p-4 text-[11px] font-bold uppercase tracking-tight leading-normal">
              The bonus is calculated automatically during registration based on current leaderboard scores. It helps late players stay competitive without overtaking active players unfairly.
            </div>
            <Button 
              onClick={handleInvite}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-950 font-black uppercase text-xs tracking-widest h-12 rounded-2xl gap-2 shadow-lg"
            >
              <Share2 className="h-4 w-4" /> Invite a Friend
            </Button>
            <p className="text-[10px] text-blue-200 font-black uppercase tracking-widest text-center">
              The bonus is awarded once and does not change later.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
