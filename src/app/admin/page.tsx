
"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { MainNav } from "@/components/layout/main-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { RefreshCcw, ShieldCheck, AlertCircle, Loader2, Zap } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function AdminPage() {
  const { user, profile, stats, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [isSyncing, setIsSyncing] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!authLoading && (!user || profile?.role !== "superadmin")) {
      router.replace("/dashboard")
    }
  }, [user, profile, authLoading, router])

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error("Session expired. Please login again.")
      }

      const response = await fetch("/api/admin/sync-fixtures", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync fixtures")
      }

      toast({
        title: "Sync Successful",
        description: `Successfully synchronized ${data.count} fixtures and scores.`,
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error.message,
      })
    } finally {
      setIsSyncing(false)
    }
  }

  if (authLoading || profile?.role !== "superadmin") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <MainNav />
      <header className="px-6 py-4 bg-gray-900 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none">CONTROL TOWER</h1>
              <div className="flex items-center gap-2 mt-1">
                 <p className="text-[8px] uppercase font-bold text-gray-400 tracking-widest">Superadmin Terminal</p>
                 {stats && (
                   <div className="flex items-center gap-1.5">
                     <span className="h-0.5 w-0.5 rounded-full bg-gray-700" />
                     <span className="text-[9px] font-black text-primary uppercase italic">Rank #{stats.rank}</span>
                     <span className="text-[9px] font-black text-white uppercase">({stats.points} pts)</span>
                     <span className="h-0.5 w-0.5 rounded-full bg-gray-700" />
                     <div className="flex items-center gap-1 bg-yellow-400/10 px-1.5 py-0.5 rounded-full border border-yellow-400/20">
                        <Zap className="h-2 w-2 text-yellow-400 fill-yellow-400" />
                        <span className="text-[8px] font-black text-yellow-400">{stats.lifelines}</span>
                     </div>
                   </div>
                 )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        <Card className="rounded-[2.5rem] border-0 shadow-xl overflow-hidden">
          <CardHeader className="bg-white border-b border-gray-100 p-8">
            <CardTitle className="text-xl font-black uppercase italic text-gray-900">Data Synchronization</CardTitle>
            <CardDescription className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">
              Manual Refresh of FIFA World Cup 2026 Data
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="p-5 bg-blue-50 border border-blue-100 rounded-3xl flex gap-4 items-start">
              <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
              <p className="text-xs text-blue-700 font-medium leading-relaxed">
                Clicking the button below will fetch the latest match details, kickoff times, and scores directly from the source. This will automatically trigger leaderboard updates for all players.
              </p>
            </div>

            <Button 
              onClick={handleSync} 
              disabled={isSyncing}
              className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-lg tracking-tight shadow-lg transition-all active:scale-95"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-6 w-6 mr-2 animate-spin" />
                  Syncing Arena...
                </>
              ) : (
                <>
                  <RefreshCcw className="h-6 w-6 mr-2" />
                  Sync Fixtures & Scores
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em]">
            System Status: Operational • All Nodes Active
          </p>
        </div>
      </main>
    </div>
  )
}
