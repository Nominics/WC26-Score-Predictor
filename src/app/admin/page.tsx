
"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { MainNav } from "@/components/layout/main-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { RefreshCcw, Loader2, Zap, Star, UserSearch, UserPlus, Calendar, Clock, Play } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ModeToggle } from "@/components/mode-toggle"
import { DateTime } from "luxon"
import Image from "next/image"
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
  const [isRunningCron, setIsRunningCron] = useState(false)
  const [isAwarding, setIsAwarding] = useState(false)
  const [isPromoting, setIsPromoting] = useState(false)
  const [isUpdatingTime, setIsUpdatingTime] = useState(false)
  const [allProfiles, setAllProfiles] = useState<any[]>([])
  const [fixtures, setFixtures] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState("")
  const [selectedUserForRole, setSelectedUserForRole] = useState("")
  const [selectedFixture, setSelectedFixture] = useState("")
  const [newTime, setNewTime] = useState("")
  const [points, setPoints] = useState("")
  const [reason, setReason] = useState("")
  const [showConfirmPoints, setShowConfirmPoints] = useState(false)
  const [showConfirmPromote, setShowConfirmPromote] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!authLoading && (!user || profile?.role !== "superadmin")) {
      router.replace("/dashboard")
    }
    if (profile?.role === "superadmin") {
      fetchProfiles()
      fetchFixtures()
    }
  }, [user, profile, authLoading, router])

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("id, display_name, role").order("display_name")
    setAllProfiles(data || [])
  }

  const fetchFixtures = async () => {
    const { data } = await supabase.from("fixtures").select("*").order("kickoff_at", { ascending: true })
    setFixtures(data || [])
  }

  const handleRunCron = async () => {
    setIsRunningCron(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error("Session expired.")

      const response = await fetch("/api/admin/run-cron", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        }
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Cron failed")

      toast({ 
        title: "Cron Successful", 
        description: `Synced ${data.syncedFixtures} matches. Sent ${data.remindersSent} reminders.` 
      })
      fetchFixtures()
    } catch (error: any) {
      toast({ variant: "destructive", title: "Cron Failed", description: error.message })
    } finally {
      setIsRunningCron(false)
    }
  }

  const handleUpdateTime = async () => {
    if (!selectedFixture || !newTime) return
    setIsUpdatingTime(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error("Session expired.")

      const isoTime = DateTime.fromISO(newTime, { zone: "America/New_York" }).toUTC().toISO()

      const response = await fetch("/api/admin/update-fixture-time", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fixtureId: selectedFixture,
          newKickoffAt: isoTime
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Update failed")

      toast({ title: "Time Updated!", description: "The fixture kickoff time has been changed." })
      setSelectedFixture("")
      setNewTime("")
      fetchFixtures()
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message })
    } finally {
      setIsUpdatingTime(false)
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
      setShowConfirmPoints(false)
    }
  }

  const handlePromoteUser = async () => {
    setIsPromoting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error("Session expired.")

      const response = await fetch("/api/admin/promote-user", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          targetUserId: selectedUserForRole
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Promotion failed")

      toast({ title: "User Promoted!", description: "Superadmin access granted." })
      setSelectedUserForRole("")
      fetchProfiles() 
    } catch (error: any) {
      toast({ variant: "destructive", title: "Promotion Failed", description: error.message })
    } finally {
      setIsPromoting(false)
      setShowConfirmPromote(false)
    }
  }

  if (authLoading || profile?.role !== "superadmin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <MainNav />
      <header className="px-6 py-4 bg-gray-900 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <div className="relative h-6 w-6 shrink-0">
              <Image src="/logo.png" alt="Arena Logo" fill className="object-contain" />
            </div>
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
          <div className="flex items-center gap-2">
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        {/* System Operations */}
        <Card className="rounded-[2.5rem] border-0 shadow-xl overflow-hidden bg-card">
          <CardHeader className="bg-muted/50 border-b border-border p-8">
            <CardTitle className="text-xl font-black uppercase italic text-foreground">System Operations</CardTitle>
            <CardDescription className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest mt-1">
              Run Sync & Reminder Routines
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <Button 
              onClick={handleRunCron} 
              disabled={isRunningCron}
              className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-lg tracking-tight shadow-lg"
            >
              {isRunningCron ? <Loader2 className="h-6 w-6 mr-2 animate-spin" /> : <Play className="h-6 w-6 mr-2" />}
              Force Cron Sync (Sync & Reminders)
            </Button>
          </CardContent>
        </Card>

        {/* Manual Points Section */}
        <Card className="rounded-[2.5rem] border-0 shadow-xl overflow-hidden bg-card">
          <CardHeader className="bg-muted/50 border-b border-border p-8">
            <CardTitle className="text-xl font-black uppercase italic text-foreground">Manual Points</CardTitle>
            <CardDescription className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest mt-1">
              Award Bonus or Adjust Scores
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                <UserSearch className="h-3 w-3" /> Select Player
              </label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="h-14 rounded-2xl border-border bg-muted/50 font-bold">
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
                  <label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                    <Star className="h-3 w-3" /> Points
                  </label>
                  <Input 
                    type="number"
                    placeholder="+10 or -5"
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                    className="h-14 rounded-2xl border-border bg-muted/50 font-bold"
                  />
               </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground">Reason for Adjustment</label>
              <Textarea 
                placeholder="e.g. Correct Prediction Bonus, Referral Reward, etc."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="rounded-2xl border-border bg-muted/50 font-medium min-h-[100px]"
              />
            </div>

            <Button 
              onClick={() => setShowConfirmPoints(true)}
              disabled={!selectedUser || !points || points === "0" || !reason || isAwarding}
              className="w-full h-16 rounded-2xl bg-foreground hover:bg-foreground/90 text-background font-black uppercase text-lg tracking-tight shadow-lg"
            >
              {isAwarding ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <Star className="h-6 w-6 mr-2" />}
              Award Points
            </Button>
          </CardContent>
        </Card>

        {/* Fixture Management Section */}
        <Card className="rounded-[2.5rem] border-0 shadow-xl overflow-hidden bg-card">
          <CardHeader className="bg-muted/50 border-b border-border p-8">
            <CardTitle className="text-xl font-black uppercase italic text-foreground">Fixture Management</CardTitle>
            <CardDescription className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest mt-1">
              Correct Match Times
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                <Calendar className="h-3 w-3" /> Select Match
              </label>
              <Select value={selectedFixture} onValueChange={setSelectedFixture}>
                <SelectTrigger className="h-14 rounded-2xl border-border bg-muted/50 font-bold">
                  <SelectValue placeholder="Choose a fixture..." />
                </SelectTrigger>
                <SelectContent>
                  {fixtures.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.home_team} vs {f.away_team} ({DateTime.fromISO(f.kickoff_at).toFormat('LLL dd, HH:mm')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                <Clock className="h-3 w-3" /> New Kickoff Time (EST)
              </label>
              <Input 
                type="datetime-local"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="h-14 rounded-2xl border-border bg-muted/50 font-bold"
              />
            </div>

            <Button 
              onClick={handleUpdateTime}
              disabled={!selectedFixture || !newTime || isUpdatingTime}
              className="w-full h-16 rounded-2xl bg-foreground hover:bg-foreground/90 text-background font-black uppercase text-lg tracking-tight shadow-lg"
            >
              {isUpdatingTime ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <Clock className="h-6 w-6 mr-2" />}
              Update Match Time
            </Button>
          </CardContent>
        </Card>

        {/* Access Management Section */}
        <Card className="rounded-[2.5rem] border-0 shadow-xl overflow-hidden bg-card">
          <CardHeader className="bg-muted/50 border-b border-border p-8">
            <CardTitle className="text-xl font-black uppercase italic text-foreground">Access Management</CardTitle>
            <CardDescription className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest mt-1">
              Grant Administrative Privileges
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                <UserSearch className="h-3 w-3" /> Select User
              </label>
              <Select value={selectedUserForRole} onValueChange={setSelectedUserForRole}>
                <SelectTrigger className="h-14 rounded-2xl border-border bg-muted/50 font-bold">
                  <SelectValue placeholder="Select user to promote..." />
                </SelectTrigger>
                <SelectContent>
                  {allProfiles
                    .filter(p => p.role !== "superadmin")
                    .map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={() => setShowConfirmPromote(true)}
              disabled={!selectedUserForRole || isPromoting}
              className="w-full h-16 rounded-2xl bg-foreground hover:bg-foreground/90 text-background font-black uppercase text-lg tracking-tight shadow-lg"
            >
              {isPromoting ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <UserPlus className="h-6 w-6 mr-2" />}
              Promote to Superadmin
            </Button>
          </CardContent>
        </Card>

        {/* Confirmation Dialogs */}
        <AlertDialog open={showConfirmPoints} onOpenChange={setShowConfirmPoints}>
          <AlertDialogContent className="rounded-[2.5rem] bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-black uppercase italic text-foreground">Confirm Adjustment</AlertDialogTitle>
              <AlertDialogDescription className="font-medium text-muted-foreground">
                You are about to award <span className="text-primary font-black">{points}</span> points to <span className="text-foreground font-black">{allProfiles.find(p => p.id === selectedUser)?.display_name}</span>. This action will be visible in the live feed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-2xl">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleAwardPoints} className="rounded-2xl bg-primary text-primary-foreground">Confirm Award</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showConfirmPromote} onOpenChange={setShowConfirmPromote}>
          <AlertDialogContent className="rounded-[2.5rem] bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-black uppercase italic text-foreground">Grant Admin Access?</AlertDialogTitle>
              <AlertDialogDescription className="font-medium text-muted-foreground">
                Are you sure you want to grant <span className="text-foreground font-black">{allProfiles.find(p => p.id === selectedUserForRole)?.display_name}</span> Superadmin privileges? They will have full control over the Arena.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-2xl">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handlePromoteUser} className="rounded-2xl bg-primary text-primary-foreground">Confirm Promotion</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  )
}
