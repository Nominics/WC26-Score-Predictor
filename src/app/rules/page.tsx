"use client"

import { MainNav } from "@/components/layout/main-nav"
import { ModeToggle } from "@/components/mode-toggle"
import { NotificationBell } from "@/components/layout/notification-bell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Award, Zap, Calendar, ShieldAlert, Flag, Sparkles, Info, Share2, Target } from "lucide-react"
import { cn, copyToClipboard } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import Image from "next/image"

const RULES = [
  { title: "Exact Score", points: 3, description: "Predict the exact final score of the match.", icon: Award },
  { title: "Correct Result", points: 1, description: "Predict the correct winner or a draw outcome.", icon: Zap },
  { title: "Predict Scorer", points: 2, description: "Nominate one player to score. Optional bonus pick.", icon: Target },
  { title: "Time Limit", points: 0, description: "Score lock: 15m after kickoff. Scorer lock: At kickoff.", icon: Calendar },
  { title: "Lifeline usage", points: 0, description: "Use 1 of 5 lifelines to update scores until the 50th minute.", icon: ShieldAlert },
];

export default function RulesPage() {
  const { toast } = useToast()

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}`
    const success = await copyToClipboard(shareUrl)
    if (success) {
      toast({ title: "Link Copied", description: "Invite your friends to the Arena!" })
    }
  }

  return (
    <div className="min-h-screen pb-32">
      <MainNav />
      <header className="premium-header">
        <div className="max-w-2xl mx-auto flex items-center justify-between h-14">
          <div className="flex items-center gap-3 overflow-visible">
            <div className="relative h-10 w-10 shrink-0 drop-shadow-xl">
              <Image src="/logo.png" alt="Arena Logo" fill className="object-contain" />
            </div>
            <div className="overflow-visible">
              <h1 className="text-xl leading-none flex items-center gap-1 uppercase overflow-visible">
                <span className="premium-gold-gradient-heading">ARENA</span> <span className="text-foreground font-black italic tracking-tight">RULES</span>
              </h1>
              <p className="text-[9px] uppercase font-black text-muted-foreground tracking-[0.2em] mt-1">Official Regulations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <NotificationBell />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-8 mt-6">
        <div className="space-y-6">
          <Card className="app-glass-card border-border/40 overflow-visible">
            <CardHeader className="flex flex-row items-center gap-3 bg-muted/30 p-6 rounded-t-[2.5rem] overflow-visible">
              <div className="bg-primary/10 p-2.5 rounded-xl">
                  <Info className="text-primary h-5 w-5"/>
              </div>
              <CardTitle className="text-foreground font-black italic uppercase tracking-tight text-lg">Scoring Protocol</CardTitle>
            </CardHeader>
            <CardContent className="p-6 text-sm text-muted-foreground font-medium leading-relaxed">
              Points are calculated automatically after each match is finalized. Your leaderboard rank updates live based on accuracy.
            </CardContent>
          </Card>

          <div className="grid gap-4 overflow-visible">
            {RULES.map((rule, i) => (
              <div key={i} className="p-6 app-glass-card flex justify-between items-center group hover:scale-[1.01] transition-all overflow-visible border-border/40">
                <div className="flex items-center gap-5">
                  <div className="bg-muted p-3.5 rounded-2xl shadow-inner">
                      <rule.icon className={cn("h-6 w-6", rule.title === "Lifeline usage" ? "text-primary animate-pulse" : "text-muted-foreground")} />
                  </div>
                  <div className="space-y-1 overflow-visible">
                      <h3 className="text-lg font-black italic text-foreground uppercase tracking-tight leading-none overflow-visible">
                        <span className="premium-gold-gradient-text">{rule.title}</span>
                      </h3>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60 leading-tight">{rule.description}</p>
                  </div>
                </div>
                {rule.points > 0 && (
                  <div className="text-right overflow-visible shrink-0">
                      <span className="premium-gold-gradient-number text-4xl leading-none">+{rule.points}</span>
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">pts</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <Card className="app-glass-card border-border/40 overflow-visible">
            <CardHeader className="flex flex-row items-center gap-3 bg-primary/5 p-6 rounded-t-[2.5rem] overflow-visible">
              <div className="bg-primary/10 p-2.5 rounded-xl">
                  <Flag className="text-primary h-5 w-5"/>
              </div>
              <CardTitle className="text-foreground font-black italic uppercase tracking-tight text-lg">National Representation</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                Personalize your Arena profile by selecting a National Team in your profile settings. 
              </p>
              <div className="bg-muted/40 rounded-2xl p-5 text-[11px] font-black uppercase tracking-tight text-muted-foreground/80 leading-normal border border-border/40 shadow-inner">
                Once selected, your nation's flag serves as your official avatar in the Global Leaderboard. Show your colors as you climb!
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary text-black shadow-2xl rounded-[2.5rem] overflow-visible border-0 relative isolate">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none rounded-[inherit]" />
            <CardHeader className="flex flex-row items-center gap-3 bg-black/5 p-6 rounded-t-[2.5rem] overflow-visible">
              <div className="bg-black/10 p-2.5 rounded-xl">
                  <Sparkles className="h-5 w-5"/>
              </div>
              <CardTitle className="font-black italic uppercase tracking-tight text-lg">Late Join Bonus</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6 relative z-10">
              <p className="text-sm font-bold leading-relaxed opacity-80">
                Players joining after kickoff may receive a starting bonus to stay competitive.
              </p>
              <div className="bg-black/10 rounded-2xl p-5 text-[11px] font-black uppercase tracking-tight leading-normal shadow-inner">
                Calculated automatically based on current leaderboard scores. It helps new entries compete without overtaking veterans unfairly.
              </div>
              <Button 
                onClick={handleShare}
                className="w-full bg-black text-primary hover:bg-black/90 font-black uppercase text-xs tracking-[0.2em] h-14 rounded-2xl gap-2 shadow-xl border-0"
              >
                <Share2 className="h-4 w-4" /> Invite Fellow Competitors
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
