"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { MainNav } from "@/components/layout/main-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { RefreshCcw, Loader2, Zap, Star, UserSearch, UserPlus, Calendar, Clock, Send, UserCircle, ShieldCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ModeToggle } from "@/components/mode-toggle"
import { DateTime } from "luxon"
import { NotificationBell } from "@/components/layout/notification-bell"
import { PROFILE_ICON_PRESETS } from "@/lib/profile-icons"
import Image from "next/image"
import { cn } from "@/lib/utils"
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
  const { user, profile, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [isRunningCron, setIsRunningCron] = useState(false)
  const [isAwarding, setIsAwarding] = useState(false)
  const [isUpdatingTime, setIsUpdatingTime] = useState(false)
  const [isSendingNotif, setIsSendingNotif] = useState(false)
  const [isAssigningIcon, setIsAssigningIcon] = useState(false)
  
  const [allProfiles, setAllProfiles] = useState<any[]>([])
  const [fixtures, setFixtures] = useState<any[]>([])
  
  const [selectedUser, setSelectedUser] = useState("")
  const [selectedUserForRole, setSelectedUserForRole] = useState("")
  const [selectedFixture, setSelectedFixture] = useState("")
  const [newTime, setNewTime] = useState("")
  const [points, setPoints] = useState("")
  const [reason, setReason] = useState("")
  
  // Icon Assignment states
  const [selectedUserForIcon, setSelectedUserForIcon] = useState("")
  const [selectedIconKey, setSelectedIconKey] = useState("")

  // Notification States
  const [notifTarget, setNotifTarget] = useState("all")
  const [notifSelectedUser, setNotifSelectedUser] = useState("")
  const [notifTitle, setNotifTitle] = useState("")
  const [notifMessage, setNotifMessage] = useState("")
  const [notifType, setNotifType] = useState("manual_admin")

  const [showConfirmPoints, setShowConfirmPoints] = useState(false)
  
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
    const { data } = await supabase.from("profiles").select("id, display_name, role, profile_icon_key, favorite_team").order("display_name")
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

  const handleSendNotification = async () => {
    setIsSendingNotif(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error("Session expired.")

      const response = await fetch("/api/admin/send-notification", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          allUsers: notifTarget === "all",
          targetUserIds: notifTarget === "single" ? [notifSelectedUser] : [],
          title: notifTitle,
          message: notifMessage,
          type: notifType
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to send")

      toast({ title: "Sent!", description: `Notification broadcast to ${data.sentCount} users.` })
      setNotifTitle("")
      setNotifMessage("")
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed", description: error.message })
    } finally {
      setIsSendingNotif(false)
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

  const handleSetProfileIcon = async () => {
    if (!selectedUserForIcon || !selectedIconKey) return
    setIsAssigningIcon(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error("Session expired.")

      const response = await fetch("/api/admin/set-profile-icon", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          targetUserId: selectedUserForIcon,
          profileIconKey: selectedIconKey
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Assignment failed")

      toast({ title: "Icon Assigned!", description: "User profile icon has been set." })
      setSelectedUserForIcon("")
      setSelectedIconKey("")
      fetchProfiles()
    } catch (error: any) {
      toast({ variant: "destructive", title: "Assignment Failed", description: error.message })
    } finally {
      setIsAssigningIcon(false)
    }
  }

  if (authLoading || profile?.role !== "superadmin") {
    return <Loader2 className="h-8 w-8 text-primary animate-spin" />
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <MainNav />
      <header className="premium-header sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <div className="relative h-10 w-10 shrink-0 drop-shadow-xl">
              <Image src="/logo.png" alt="Arena Logo" fill className="object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none">
                <span className="premium-gold-gradient-text">CONTROL</span> <span className="text-foreground">TOWER</span>
              </h1>
              <p className="text-[9px] uppercase font-black premium-gold-gradient-text tracking-[0.3em] mt-1 flex items-center gap-1.5">
                <ShieldCheck className="h-2.5 w-2.5" /> SUPERADMIN ACCESS
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <NotificationBell />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-8 mt-6">
        {/* System Operations */}
        <Card className="app-glass-card border-primary/20 shadow-primary/5">
          <CardHeader className="bg-muted/40 border-b border-border/50 p-6">
            <CardTitle className="text-lg font-black uppercase italic text-foreground tracking-tight">System Sync</CardTitle>
            <CardDescription className="text-muted-foreground font-bold uppercase text-[9px] tracking-widest mt-1">
              Trigger Tournament Data Refresh
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <Button 
              onClick={handleRunCron} 
              disabled={isRunningCron}
              className="w-full h-14 rounded-2xl bg-primary text-black hover:bg-primary/90 font-black uppercase text-sm tracking-[0.1em] shadow-xl shadow-primary/10 transition-all active:scale-95"
            >
              {isRunningCron ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <RefreshCcw className="h-5 w-5 mr-2" />}
              Execute Cron Routine
            </Button>
          </CardContent>
        </Card>

        {/* Broadcast Center */}
        <Card className="app-glass-card border-border/40">
          <CardHeader className="bg-muted/40 border-b border-border/50 p-6">
            <CardTitle className="text-lg font-black uppercase italic text-foreground tracking-tight">Broadcast Center</CardTitle>
            <CardDescription className="text-muted-foreground font-bold uppercase text-[9px] tracking-widest mt-1">
              Push Notification & App Alerts
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground opacity-60 tracking-widest">Target Audience</label>
                <Select value={notifTarget} onValueChange={setNotifTarget}>
                  <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-border/50 font-black uppercase text-[11px] italic tracking-tight">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Global Broadcast</SelectItem>
                    <SelectItem value="single">Targeted Alert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground opacity-60 tracking-widest">Category</label>
                <Select value={notifType} onValueChange={setNotifType}>
                  <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-border/50 font-black uppercase text-[11px] italic tracking-tight">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="manual_admin">General Notice</SelectItem>
                    <SelectItem value="app_update">System Update</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {notifTarget === "single" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-[10px] font-black uppercase text-muted-foreground opacity-60 tracking-widest">Select Recipient</label>
                <Select value={notifSelectedUser} onValueChange={setNotifSelectedUser}>
                  <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-border/50 font-bold">
                    <SelectValue placeholder="Choose user..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-[240px]">
                    {allProfiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground opacity-60 tracking-widest">Headline</label>
              <Input 
                placeholder="Brief summary of the alert..."
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                className="h-12 rounded-xl font-bold bg-muted/30 border-border/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground opacity-60 tracking-widest">Message Details</label>
              <Textarea 
                placeholder="Describe the update in detail..."
                value={notifMessage}
                onChange={(e) => setNotifMessage(e.target.value)}
                className="rounded-xl min-h-[100px] bg-muted/30 border-border/50 font-medium"
              />
            </div>

            <Button 
              onClick={handleSendNotification}
              disabled={!notifTitle || !notifMessage || (notifTarget === "single" && !notifSelectedUser) || isSendingNotif}
              className="w-full h-14 rounded-2xl bg-foreground text-background hover:bg-foreground/90 font-black uppercase text-xs tracking-[0.2em] shadow-lg transition-all"
            >
              {isSendingNotif ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Send className="h-5 w-5 mr-2" />}
              Dispatch Broadcast
            </Button>
          </CardContent>
        </Card>

        {/* Profile Icon Assignment */}
        <Card className="app-glass-card border-border/40">
          <CardHeader className="bg-muted/40 border-b border-border/50 p-6">
            <CardTitle className="text-lg font-black uppercase italic text-foreground tracking-tight">Identity Assignment</CardTitle>
            <CardDescription className="text-muted-foreground font-bold uppercase text-[9px] tracking-widest mt-1">
              Assign Avatar to Users Without Icons
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground opacity-60 tracking-widest flex items-center gap-2">
                <UserCircle className="h-3 w-3" /> Target User
              </label>
              <Select value={selectedUserForIcon} onValueChange={setSelectedUserForIcon}>
                <SelectTrigger className="h-14 rounded-2xl border-border/50 bg-muted/30 font-bold">
                  <SelectValue placeholder="Users without presets..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-[240px]">
                  {allProfiles
                    .filter(p => !p.profile_icon_key)
                    .map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-muted-foreground opacity-60 tracking-widest flex items-center gap-2">
                <Star className="h-3 w-3" /> Select Icon
              </label>
              <div className="grid grid-cols-5 gap-3 bg-muted/20 p-4 rounded-[2rem] border border-border/30">
                {PROFILE_ICON_PRESETS.map((icon) => (
                  <button
                    key={icon.key}
                    onClick={() => setSelectedIconKey(icon.key)}
                    className={cn(
                      "relative aspect-square rounded-2xl overflow-hidden border-2 transition-all hover:scale-105",
                      selectedIconKey === icon.key ? "border-primary shadow-xl scale-110 z-10" : "border-transparent opacity-40 grayscale hover:grayscale-0"
                    )}
                  >
                    <Image src={icon.imagePath} alt={icon.label} fill className="object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <Button 
              onClick={handleSetProfileIcon}
              disabled={!selectedUserForIcon || !selectedIconKey || isAssigningIcon}
              className="w-full h-16 rounded-2xl bg-foreground text-background hover:opacity-90 font-black uppercase text-sm tracking-[0.2em] shadow-xl"
            >
              {isAssigningIcon ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <UserPlus className="h-5 w-5 mr-2" />}
              Assign Identity
            </Button>
          </CardContent>
        </Card>

        {/* Manual Points Section */}
        <Card className="app-glass-card border-border/40">
          <CardHeader className="bg-muted/40 border-b border-border/50 p-6">
            <CardTitle className="text-lg font-black uppercase italic text-foreground tracking-tight">Manual Points</CardTitle>
            <CardDescription className="text-muted-foreground font-bold uppercase text-[9px] tracking-widest mt-1">
              Award Bonuses or Penalize Players
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground opacity-60 tracking-widest flex items-center gap-2">
                <UserSearch className="h-3 w-3" /> Select Player
              </label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="h-14 rounded-2xl border-border/50 bg-muted/30 font-bold">
                  <SelectValue placeholder="Choose a player..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-[240px]">
                  {allProfiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground opacity-60 tracking-widest flex items-center gap-2">
                  <Star className="h-3 w-3" /> Points Amount
                </label>
                <Input 
                  type="number"
                  placeholder="e.g. +10 or -5"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  className="h-14 rounded-2xl border-border/50 bg-muted/30 font-black italic text-lg"
                />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground opacity-60 tracking-widest">Reason for Adjustment</label>
              <Textarea 
                placeholder="e.g. Correct Prediction Bonus, Referral Reward..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="rounded-2xl border-border/50 bg-muted/30 font-medium min-h-[100px]"
              />
            </div>

            <Button 
              onClick={() => setShowConfirmPoints(true)}
              disabled={!selectedUser || !points || points === "0" || !reason || isAwarding}
              className="w-full h-16 rounded-2xl bg-foreground text-background hover:opacity-90 font-black uppercase text-sm tracking-[0.2em] shadow-xl"
            >
              {isAwarding ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Star className="h-5 w-5 mr-2" />}
              Award Points
            </Button>
          </CardContent>
        </Card>

        {/* Fixture Management Section */}
        <Card className="app-glass-card border-border/40">
          <CardHeader className="bg-muted/40 border-b border-border/50 p-6">
            <CardTitle className="text-lg font-black uppercase italic text-foreground tracking-tight">Fixture Control</CardTitle>
            <CardDescription className="text-muted-foreground font-bold uppercase text-[9px] tracking-widest mt-1">
              Correct Individual Match Data
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground opacity-60 tracking-widest flex items-center gap-2">
                <Calendar className="h-3 w-3" /> Select Match
              </label>
              <Select value={selectedFixture} onValueChange={setSelectedFixture}>
                <SelectTrigger className="h-14 rounded-2xl border-border/50 bg-muted/30 font-black uppercase text-[11px] italic tracking-tight">
                  <SelectValue placeholder="Choose a fixture..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-[300px]">
                  {fixtures.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.home_team} vs {f.away_team} ({DateTime.fromISO(f.kickoff_at).toFormat('LLL dd, HH:mm')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground opacity-60 tracking-widest flex items-center gap-2">
                <Clock className="h-3 w-3" /> New Kickoff Time (EST)
              </label>
              <Input 
                type="datetime-local"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="h-14 rounded-2xl border-border/50 bg-muted/30 font-bold"
              />
            </div>

            <Button 
              onClick={handleUpdateTime}
              disabled={!selectedFixture || !newTime || isUpdatingTime}
              className="w-full h-16 rounded-2xl bg-foreground text-background hover:opacity-90 font-black uppercase text-sm tracking-[0.2em] shadow-xl"
            >
              {isUpdatingTime ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Clock className="h-5 w-5 mr-2" />}
              Update Match Time
            </Button>
          </CardContent>
        </Card>

        {/* Confirmation Dialogs */}
        <AlertDialog open={showConfirmPoints} onOpenChange={setShowConfirmPoints}>
          <AlertDialogContent className="rounded-[2.5rem] bg-background border-primary/20">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-black uppercase italic text-foreground text-2xl tracking-tighter">Confirm Adjustment</AlertDialogTitle>
              <AlertDialogDescription className="font-medium text-muted-foreground text-sm">
                You are awarding <span className="premium-gold-gradient-text font-black italic">+{points}</span> points to <span className="text-foreground font-black uppercase">{allProfiles.find(p => p.id === selectedUser)?.display_name}</span>. This is public and permanent.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6 flex gap-3">
              <AlertDialogCancel className="rounded-2xl border-border/50 font-black uppercase text-[10px] tracking-widest h-12 flex-1">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleAwardPoints} className="rounded-2xl premium-gold-gradient-bg text-black font-black uppercase text-[10px] tracking-widest h-12 flex-1 shadow-lg shadow-primary/20">Confirm Award</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  )
}