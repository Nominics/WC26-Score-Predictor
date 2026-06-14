
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MainNav } from "@/components/layout/main-nav"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Info } from "lucide-react"
import { cn } from "@/lib/utils"

export default function Matrix() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [fixtures, setFixtures] = useState<any[]>([])
  const [predictions, setPredictions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [pRes, fRes, prRes] = await Promise.all([
        supabase.from("profiles").select("id, display_name").order("display_name"),
        supabase.from("fixtures").select("*").order("kickoff_at", { ascending: true }),
        supabase.from("predictions").select("*")
      ])
      
      if (pRes.error) throw pRes.error
      if (fRes.error) throw fRes.error
      if (prRes.error) throw prRes.error

      setProfiles(pRes.data || [])
      setFixtures(fRes.data || [])
      setPredictions(prRes.data || [])
    } catch (err) {
      console.error("Matrix fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  const getCellData = (userId: string, fixture: any) => {
    const pred = predictions.find(p => p.user_id === userId && p.fixture_id === fixture.id)
    if (!pred) return { text: "-", color: "bg-white/5", points: null }

    const text = `${pred.predicted_home_score}-${pred.predicted_away_score}`
    
    // Scoring logic
    if (fixture.status !== 'finished') {
      return { text, color: "bg-white/10", points: null }
    }

    // Exact score: +3
    if (fixture.home_score === pred.predicted_home_score && fixture.away_score === pred.predicted_away_score) {
      return { text, color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", points: "+3" }
    }

    // Correct result: +1
    const fixtureResult = Math.sign(fixture.home_score - fixture.away_score)
    const predResult = Math.sign(pred.predicted_home_score - pred.predicted_away_score)
    if (fixtureResult === predResult) {
      return { text, color: "bg-amber-500/20 text-amber-400 border-amber-500/30", points: "+1" }
    }

    // Wrong result: +0
    return { text, color: "bg-rose-500/20 text-rose-400 border-rose-500/30", points: "+0" }
  }

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      <MainNav />
      <header className="p-8 bg-gradient-to-b from-primary/20 to-transparent flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter">PREDICTION MATRIX</h1>
          <p className="text-[10px] text-gray-400 uppercase font-bold mt-1">Global Strategy Board</p>
        </div>
        <div className="flex gap-3 pb-1">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[8px] font-black uppercase text-gray-400">Exact (+3)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[8px] font-black uppercase text-gray-400">Result (+1)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-[8px] font-black uppercase text-gray-400">Wrong (+0)</span>
          </div>
        </div>
      </header>

      <main className="px-4 overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        ) : (
          <div className="min-w-max bg-white/5 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent bg-white/5">
                  <TableHead className="text-white font-black uppercase text-[10px] py-6 px-8 sticky left-0 bg-black/80 backdrop-blur-md z-10">Player</TableHead>
                  {fixtures.map(f => (
                    <TableHead key={f.id} className="text-center text-white font-black uppercase text-[10px] py-6 min-w-[100px]">
                      <div className="flex flex-col items-center">
                        <span className="text-gray-500 mb-1">{f.home_team.substring(0,3)} v {f.away_team.substring(0,3)}</span>
                        {f.status === 'finished' && (
                          <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-[9px]">
                            {f.home_score}-{f.away_score}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map(profile => (
                  <TableRow key={profile.id} className="border-white/5 hover:bg-white/10 transition-colors">
                    <TableCell className="font-bold text-xs text-primary uppercase whitespace-nowrap px-8 sticky left-0 bg-black/80 backdrop-blur-md z-10 border-r border-white/5">
                      {profile.display_name}
                    </TableCell>
                    {fixtures.map(f => {
                      const { text, color, points } = getCellData(profile.id, f)
                      return (
                        <TableCell key={f.id} className="text-center">
                          <div className={cn(
                            "inline-flex flex-col items-center justify-center min-w-[60px] py-2 rounded-xl font-black text-[12px] border transition-all",
                            color
                          )}>
                            <span className="tabular-nums">{text}</span>
                            {points && (
                              <span className="text-[9px] mt-0.5 opacity-80">{points}</span>
                            )}
                          </div>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      <div className="max-w-2xl mx-auto mt-8 px-4">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex gap-4 items-start">
          <Info className="h-5 w-5 text-primary shrink-0 mt-1" />
          <p className="text-[11px] text-gray-400 font-medium leading-relaxed uppercase tracking-wide">
            The matrix reflects live changes. Scoring (+3 for exact, +1 for correct outcome) is applied automatically once a match is marked as finished.
          </p>
        </div>
      </div>
    </div>
  )
}
