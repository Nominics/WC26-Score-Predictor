"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { MainNav } from "@/components/layout/main-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { RefreshCcw, ShieldCheck, Loader2, Zap, Star, UserSearch } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function AdminPage() {
  const { user, profile, stats, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [isSyncing, setIsSyncing] = useState(false)
  const [isAwarding, setIsAwarding] = useState(false)
  const [allProfiles, setAllProfiles] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState("")
  const [points, setPoints] = useState("")
  const [reason, setReason] = useState("")
  const [showConfirm, setShowConfirm] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!authLoading && (!user || profile?.role !== "superadmin")) {
      router.replace("/dashboard")
    }
    if (profile?.role === "superadmin") {
      fetchProfiles()
    }
  }, [user, profile, authLoading, router])

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("id, display_name").order("display_name")
    setAllProfiles(data || [])
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error("Session expired.")

      const response = await fetch("/api/admin/sync-fixtures", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        }
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to sync fixtures")

      toast({ title: "Sync Successful", description: `Successfully synchronized ${data.count} fixtures.` })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: error.message })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleAwardPoints = async () => {
    setIsAwarding(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error("Session expired.")

      const response = await fetch("/api/admin/award-points", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          targetUserId: selectedUser,
          points: parseInt(points),
          reason
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Award failed")

      toast({ title: "Points Awarded!", description: `Successfully added ${points} points.` })
      setSelectedUser("")
      setPoints("")
      setReason("")
    } catch (error: any) {
      toast({ variant: "destructive", title: "Award Failed", description: error.message })
    } finally {
      setIsAwarding(false)
      setShowConfirm(false)
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
              <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none">
                CONTROL <span className="text-primary">TOWER</span>
              </h1>
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
            <CardTitle className="text-xl font-black uppercase italic text-gray-900">Manual Points</CardTitle>
            <CardDescription className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">
              Award Bonus or Adjust Scores
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2">
                <UserSearch className="h-3 w-3" /> Select Player
              </label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-bold">
                  <SelectValue placeholder="Choose a player..." />
                </SelectTrigger>
                <SelectContent>
                  {allProfiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2">
                    <Star className="h-3 w-3" /> Points
                  </label>
                  <Input 
                    type="number"
                    placeholder="+10 or -5"
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                    className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-bold"
                  />
               </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400">Reason for Adjustment</label>
              <Textarea 
                placeholder="e.g. Correct Prediction Bonus, Referral Reward, etc."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="rounded-2xl border-gray-100 bg-gray-50/50 font-medium min-h-[100px]"
              />
            </div>

            <Button 
              onClick={() => setShowConfirm(true)}
              disabled={!selectedUser || !points || points === "0" || !reason || isAwarding}
              className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-lg tracking-tight shadow-lg"
            >
              {isAwarding ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <Star className="h-6 w-6 mr-2" />}
              Award Points
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-0 shadow-xl overflow-hidden">
          <CardHeader className="bg-white border-b border-gray-100 p-8">
            <CardTitle className="text-xl font-black uppercase italic text-gray-900">Data Synchronization</CardTitle>
            <CardDescription className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">
              Manual Refresh of Tournament Data
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <Button 
              onClick={handleSync} 
              disabled={isSyncing}
              className="w-full h-16 rounded-2xl bg-gray-900 hover:bg-black text-white font-black uppercase text-lg tracking-tight shadow-lg transition-all active:scale-95"
            >
              {isSyncing ? <Loader2 className="h-6 w-6 mr-2 animate-spin" /> : <RefreshCcw className="h-6 w-6 mr-2" />}
              Sync Fixtures & Scores
            </Button>
          </CardContent>
        </Card>

        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent className="rounded-[2.5rem]">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-black uppercase italic">Confirm Adjustment</AlertDialogTitle>
              <AlertDialogDescription className="font-medium text-gray-500">
                You are about to award <span className="text-primary font-black">{points}</span> points to <span className="text-gray-900 font-black">{allProfiles.find(p => p.id === selectedUser)?.display_name}</span>. This action will be visible in the live feed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-2xl">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleAwardPoints} className="rounded-2xl bg-primary">Confirm Award</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  )
}
