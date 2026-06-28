"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { MainNav } from "@/components/layout/main-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { RefreshCcw, Loader2, Zap, Star, UserSearch, UserPlus, Calendar, Clock, Send, UserCircle, ShieldCheck, RotateCcw, Search, Check, Target, Goal, History, XCircle, CheckCircle2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ModeToggle } from "@/components/mode-toggle"
import { DateTime } from "luxon"
import { NotificationBell } from "@/components/layout/notification-bell"
import { PROFILE_ICON_PRESETS } from "@/lib/profile-icons"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { AppLoadingScreen } from "@/components/layout/app-loading-screen"
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

const APP_ZONE = "Indian/Maldives"

export default function AdminPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [isRunningCron, setIsRunningCron] = useState(false)
  const [isAwarding, setIsAwarding] = useState(false)
  const [isUpdatingTime, setIsUpdatingTime] = useState(false)
  const [isResettingTime, setIsResettingTime] = useState(false)
  const [isSendingNotif, setIsSendingNotif] = useState(false)
  const [isAssigningIcon, setIsAssigningIcon] = useState(false)
  
  const [allProfiles, setAllProfiles] = useState<any[]>([])
  const [fixtures, setFixtures] = useState<any[]>([])
  const [pendingScorers, setPendingScorers] = useState<any[]>([])
  const [reviewedScorers, setReviewedScorers] = useState<any[]>([])
  const [isReviewing, setIsReviewing] = useState<string | null>(null)
  
  const [selectedUser, setSelectedUser] = useState("")
  const [selectedFixture, setSelectedFixture] = useState("")
  const [newTime, setNewTime] = useState("")
  const [points, setPoints] = useState("")
  const [reason, setReason] = useState("")
  
  // Fixture Search state
  const [fixtureSearch, setFixtureSearch] = useState("")

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
  const [showConfirmReset, setShowConfirmReset] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!authLoading && (!user || profile?.role !== "superadmin")) {
      router.replace("/dashboard")
    }
    if (profile?.role === "superadmin") {
      fetchProfiles()
      fetchFixtures()
      fetchPendingScorers()
      fetchReviewedScorers()
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

  const fetchPendingScorers = async () => {
    const { data } = await supabase
      .from("predictions")
      .select(`
        *,
        fixtures (home_team, away_team, status, home_score, away_score, home_scorers, away_scorers),
        profiles (display_name, favorite_team, profile_icon_key)
      `)
      .not("predicted_scorer_name", "is", null)
      .eq("scorer_prediction_status", "pending")
      .eq("fixtures.status", "finished")
    
    // Filter out rows where join failed (shouldn't happen with inner logic but good for safety)
    const valid = data?.filter(d => d.fixtures && (d.fixtures as any).status === 'finished') || []
    setPendingScorers(valid)
  }

  const fetchReviewedScorers = async () => {
    const { data } = await supabase
      .from("predictions")
      .select(`
        *,
        fixtures (home_team, away_team),
        profiles (display_name)
      `)
      .not("scorer_prediction_status", "eq", "pending")
      .order("scorer_reviewed_at", { ascending: false })
      .limit(10)
    setReviewedScorers(data || [])
  }

  const handleReviewScorer = async (predictionId: string, result: 'correct' | 'incorrect') => {
    setIsReviewing(predictionId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error("Session expired.")

      const response = await fetch("/api/admin/review-scorer-prediction", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ predictionId, result })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Review failed")

      toast({ 
        title: result === 'correct' ? "Awarded +2 Points" : "Marked Incorrect", 
        description: "Scorer prediction has been reviewed." 
      })
      fetchPendingScorers()
      fetchReviewedScorers()
    } catch (error: any) {
      toast({ variant: "destructive", title: "Review Error", description: error.message })
    } finally {
      setIsReviewing(null)
    }
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
      fetchPendingScorers()
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

      const utcTime = DateTime.fromISO(newTime, { zone: APP_ZONE }).toUTC().toISO()

      const response = await fetch("/api/admin/update-fixture-time", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fixtureId: selectedFixture,
          newKickoffAt: utcTime
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

  const handleResetTime = async () => {
    if (!selectedFixture) return
    setIsResettingTime(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error("Session expired.")

      const response = await fetch("/api/admin/reset-fixture-time", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fixtureId: selectedFixture
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Reset failed")

      toast({ title: "Time Reset!", description: "The match has been reverted to API time." })
      setSelectedFixture("")
      setNewTime("")
      fetchFixtures()
    } catch (error: any) {
      toast({ variant: "destructive", title: "Reset Failed", description: error.message })
    } finally {
      setIsResettingTime(false)
      setShowConfirmReset(false)
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
    return <AppLoadingScreen />
  }

  const currentSelectedFixture = fixtures.find(f => f.id === selectedFixture)
  const canResetToApi = currentSelectedFixture?.manually_updated_kickoff_at && currentSelectedFixture?.api_kickoff_at

  const filteredFixtures = fixtures.filter(f => 
    `${f.home_team} ${f.away_team}`.toLowerCase().includes(fixtureSearch.toLowerCase())
  )

  const cleanScorers = (scorers: string | null) => {
    if (!scorers || scorers === 'null') return "None recorded";
    return scorers.replace(/[{}"']/g, '').replace(/[;,]/g, ' • ');
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <MainNav />
      <header className="premium-header sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-between h-14">
          <div className="flex items-center gap-4 overflow-visible">
            <div className="relative h-10 w-10 shrink-0 drop-shadow-xl">
              <Image src="/logo.png" alt="Arena Logo" fill className="object-contain" />
            </div>
            <div className="overflow-visible">
              <h1 className="text-xl leading-none flex items-center gap-1 uppercase overflow-visible">
                <span className="premium-gold-gradient-heading">CONTROL</span> <span className="text-foreground font-black italic tracking-tight">TOWER</span>
              </h1>
              <p className="text-[9px] uppercase font-black premium-gold-gradient-heading tracking-[0.3em] mt-1 flex items-center gap-1.5 overflow-visible">
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

      <main className="max-w-2xl mx-auto p-4 space-y-8 mt-6 overflow-visible">
        {/* Scorer Prediction Review Hub */}
        <Card className="app-glass-card border-primary/20 shadow-primary/5 overflow-visible">
          <CardHeader className="bg-muted/40 border-b border-border/50 p-6 rounded-t-[2.5rem] overflow-visible">
            <CardTitle className="overflow-visible flex items-center gap-3">
              <Target className="h-5 w-5 text-primary" />
              <span className="premium-gold-gradient-heading text-lg">Scorer Review Hub</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground font-bold uppercase text-[9px] tracking-widest mt-1">
              Verify goal-scorer predictions and award bonuses
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {pendingScorers.length === 0 ? (
              <div className="py-12 text-center bg-muted/20 rounded-[2rem] border-2 border-dashed border-border/40">
                <Goal className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">No pending scorer reviews</p>
                <p className="text-[8px] font-bold text-muted-foreground/40 uppercase mt-1">Matches must be finished to review</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase text-primary tracking-widest px-2">{pendingScorers.length} Pending Review{pendingScorers.length !== 1 ? 's' : ''}</h4>
                <div className="space-y-4">
                  {pendingScorers.map((rev) => {
                    const f = rev.fixtures as any;
                    const p = rev.profiles as any;
                    return (
                      <div key={rev.id} className="p-5 bg-muted/30 rounded-[2rem] border border-border/40 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <span className="text-[9px] font-black uppercase text-muted-foreground opacity-60">Match Outcome</span>
                            <p className="font-black text-xs uppercase tracking-tight italic">
                              {f.home_team} {f.home_score} - {f.away_score} {f.away_team}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                               <Goal className="h-3 w-3 text-primary opacity-50" />
                               <span className="text-[9px] font-bold text-muted-foreground italic break-words max-w-[200px]">
                                 {cleanScorers(f.home_scorers)} • {cleanScorers(f.away_scorers)}
                               </span>
                            </div>
                          </div>
                          <div className="text-right">
                             <span className="text-[9px] font-black uppercase text-muted-foreground opacity-60">Player</span>
                             <p className="premium-gold-gradient-heading text-xs">{p.display_name}</p>
                          </div>
                        </div>

                        <div className="p-4 bg-background/50 rounded-2xl border border-primary/10 flex items-center justify-between">
                           <div className="space-y-1">
                              <span className="text-[8px] font-black uppercase text-primary tracking-[0.2em]">Prediction</span>
                              <p className="text-sm font-black italic uppercase">🎯 {rev.predicted_scorer_name}</p>
                           </div>
                           <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => handleReviewScorer(rev.id, 'incorrect')}
                                disabled={!!isReviewing}
                                variant="outline"
                                className="h-10 rounded-xl px-4 text-[9px] font-black uppercase tracking-widest hover:bg-destructive/10 hover:text-destructive"
                              >
                                {isReviewing === rev.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3 mr-1.5" />}
                                Incorrect
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => handleReviewScorer(rev.id, 'correct')}
                                disabled={!!isReviewing}
                                className="h-10 rounded-xl px-4 premium-gold-pill text-[9px] shadow-lg"
                              >
                                {isReviewing === rev.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1.5" />}
                                Correct (+2)
                              </Button>
                           </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Reviewed History */}
            {reviewedScorers.length > 0 && (
              <div className="pt-6 border-t border-border/30 space-y-4">
                <div className="flex items-center gap-2 px-2">
                  <History className="h-3.5 w-3.5 text-muted-foreground" />
                  <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Recent Reviews</h4>
                </div>
                <div className="space-y-2">
                  {reviewedScorers.map((rev) => (
                    <div key={rev.id} className="flex items-center justify-between p-3 bg-muted/10 rounded-xl border border-border/20 text-[10px]">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground">{(rev.profiles as any)?.display_name}</span>
                        <span className="text-[8px] text-muted-foreground uppercase">{(rev.fixtures as any)?.home_team} vs {(rev.fixtures as any)?.away_team}</span>
                      </div>
                      <div className="flex items-center gap-3">
                         <span className="italic font-medium text-muted-foreground opacity-60">Pick: {rev.predicted_scorer_name}</span>
                         <span className={cn(
                           "font-black uppercase tracking-tighter text-[9px] px-2 py-0.5 rounded-full",
                           rev.scorer_prediction_status === 'correct' ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
                         )}>
                           {rev.scorer_prediction_status}
                         </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Operations */}
        <Card className="app-glass-card border-primary/20 shadow-primary/5 overflow-visible">
          <CardHeader className="bg-muted/40 border-b border-border/50 p-6 rounded-t-[2.5rem] overflow-visible">
            <CardTitle className="overflow-visible">
              <span className="premium-gold-gradient-heading text-lg">System Sync</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground font-bold uppercase text-[9px] tracking-widest mt-1">
              Trigger Tournament Data Refresh
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <Button 
              onClick={handleRunCron} 
              disabled={isRunningCron}
              className="w-full h-14 rounded-2xl premium-gold-pill hover:opacity-90 transition-all active:scale-95"
            >
              {isRunningCron ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <RefreshCcw className="h-5 w-5 mr-2" />}
              Execute Cron Routine
            </Button>
          </CardContent>
        </Card>

        {/* Broadcast Center */}
        <Card className="app-glass-card border-border/40 overflow-visible">
          <CardHeader className="bg-muted/40 border-b border-border/50 p-6 rounded-t-[2.5rem] overflow-visible">
            <CardTitle className="overflow-visible">
              <span className="premium-gold-gradient-heading text-lg">Broadcast Center</span>
            </CardTitle>
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
              className="w-full h-14 rounded-2xl bg-foreground text-background hover:opacity-90 font-black uppercase text-xs tracking-[0.2em] shadow-lg transition-all"
            >
              {isSendingNotif ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Send className="h-5 w-5 mr-2" />}
              Dispatch Broadcast
            </Button>
          </CardContent>
        </Card>

        {/* Profile Icon Assignment */}
        <Card className="app-glass-card border-border/40 overflow-visible">
          <CardHeader className="bg-muted/40 border-b border-border/50 p-6 rounded-t-[2.5rem] overflow-visible">
            <CardTitle className="overflow-visible">
              <span className="premium-gold-gradient-heading text-lg">Identity Assignment</span>
            </CardTitle>
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
                      selectedIconKey === icon.key ? "premium-gold-ring shadow-xl scale-110 z-10" : "border-transparent opacity-40 grayscale hover:grayscale-0"
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
        <Card className="app-glass-card border-border/40 overflow-visible">
          <CardHeader className="bg-muted/40 border-b border-border/50 p-6 rounded-t-[2.5rem] overflow-visible">
            <CardTitle className="overflow-visible">
              <span className="premium-gold-gradient-heading text-lg">Manual Points</span>
            </CardTitle>
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
                <input 
                  type="number"
                  placeholder="e.g. +10 or -5"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  className="h-14 w-full rounded-2xl border-border/50 bg-muted/30 font-black italic text-lg px-4"
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
        <Card className="app-glass-card border-border/40 overflow-visible">
          <CardHeader className="bg-muted/40 border-b border-border/50 p-6 rounded-t-[2.5rem] overflow-visible">
            <CardTitle className="overflow-visible">
              <span className="premium-gold-gradient-heading text-lg">Fixture Control</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground font-bold uppercase text-[9px] tracking-widest mt-1">
              Correct Individual Match Data (All times in Maldives {APP_ZONE})
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground opacity-60 tracking-widest flex items-center gap-2">
                <Calendar className="h-3 w-3" /> Select Match
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    role="combobox" 
                    className="w-full h-14 rounded-2xl border-border/50 bg-muted/30 font-black uppercase text-[11px] italic tracking-tight justify-between"
                  >
                    {selectedFixture 
                      ? fixtures.find(f => f.id === selectedFixture)
                        ? `${fixtures.find(f => f.id === selectedFixture).home_team} vs ${fixtures.find(f => f.id === selectedFixture).away_team}`
                        : "Select Match..."
                      : "Choose a fixture..."
                    }
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-2xl border-border/50 bg-background shadow-2xl overflow-hidden">
                  <div className="flex items-center border-b px-3 bg-muted/10">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <input
                      className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Search teams..."
                      value={fixtureSearch}
                      onChange={(e) => setFixtureSearch(e.target.value)}
                    />
                  </div>
                  <ScrollArea className="h-[300px]">
                    <div className="p-2">
                      {filteredFixtures.length === 0 ? (
                        <div className="py-6 text-center text-xs text-muted-foreground uppercase font-black tracking-widest">No match found.</div>
                      ) : (
                        filteredFixtures.map((f) => (
                          <button
                            key={f.id}
                            onClick={() => {
                              setSelectedFixture(f.id)
                              setFixtureSearch("")
                            }}
                            className={cn(
                              "relative flex w-full cursor-default select-none items-center rounded-xl px-4 py-3 text-xs font-bold outline-none hover:bg-muted/50 transition-colors text-left",
                              selectedFixture === f.id ? "bg-primary/10 text-primary" : "text-foreground"
                            )}
                          >
                            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                              <span className="truncate">{f.home_team} vs {f.away_team}</span>
                              <span className="text-[9px] opacity-60 font-medium">
                                {DateTime.fromISO(f.kickoff_at).setZone(APP_ZONE).toFormat('LLL dd, HH:mm')}
                              </span>
                            </div>
                            {selectedFixture === f.id && <Check className="ml-2 h-4 w-4 shrink-0" />}
                          </button>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground opacity-60 tracking-widest flex items-center gap-2">
                <Clock className="h-3 w-3" /> New Kickoff Time ({APP_ZONE})
              </label>
              <input 
                type="datetime-local"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="h-14 w-full rounded-2xl border-border/50 bg-muted/30 font-bold px-4 text-foreground"
              />
            </div>

            <div className="space-y-3 pt-2">
              <Button 
                onClick={handleUpdateTime}
                disabled={!selectedFixture || !newTime || isUpdatingTime}
                className="w-full h-16 rounded-2xl bg-foreground text-background hover:opacity-90 font-black uppercase text-sm tracking-[0.2em] shadow-xl"
              >
                {isUpdatingTime ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Clock className="h-5 w-5 mr-2" />}
                Update Match Time
              </Button>

              <Button 
                onClick={() => setShowConfirmReset(true)}
                disabled={!selectedFixture || !canResetToApi || isResettingTime}
                variant="outline"
                className="w-full h-14 rounded-2xl border-border/50 bg-muted/20 font-black uppercase text-xs tracking-[0.2em] flex items-center gap-2"
              >
                {isResettingTime ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                {canResetToApi ? "RESET TO API TIME" : "API TIME NOT AVAILABLE"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Confirmation Dialogs */}
        <AlertDialog open={showConfirmPoints} onOpenChange={setShowConfirmPoints}>
          <AlertDialogContent className="rounded-[2.5rem] bg-background border-primary/20 overflow-visible">
            <AlertDialogHeader className="overflow-visible">
              <AlertDialogTitle className="overflow-visible">
                <span className="premium-gold-gradient-heading text-2xl">Confirm Adjustment</span>
              </AlertDialogTitle>
              <AlertDialogDescription className="font-medium text-muted-foreground text-sm">
                You are awarding <span className="premium-gold-gradient-heading font-black italic">+{points}</span> points to <span className="text-foreground font-black uppercase">{allProfiles.find(p => p.id === selectedUser)?.display_name}</span>. This is public and permanent.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6 flex gap-3">
              <AlertDialogCancel className="rounded-2xl border-border/50 font-black uppercase text-[10px] tracking-widest h-12 flex-1">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleAwardPoints} className="rounded-2xl premium-gold-pill border-0 flex-1 shadow-lg shadow-primary/20">Confirm Award</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showConfirmReset} onOpenChange={setShowConfirmReset}>
          <AlertDialogContent className="rounded-[2.5rem] bg-background border-primary/20 overflow-visible">
            <AlertDialogHeader className="overflow-visible">
              <AlertDialogTitle className="overflow-visible">
                <span className="premium-gold-gradient-heading text-2xl">Reset Schedule</span>
              </AlertDialogTitle>
              <AlertDialogDescription className="font-medium text-muted-foreground text-sm">
                Reset this match time back to the API time? This will re-enable automatic sync from the tournament source.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6 flex gap-3">
              <AlertDialogCancel className="rounded-2xl border-border/50 font-black uppercase text-[10px] tracking-widest h-12 flex-1">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleResetTime} className="rounded-2xl bg-destructive text-destructive-foreground font-black uppercase text-[10px] tracking-widest h-12 flex-1 shadow-lg">Reset Time</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  )
}
