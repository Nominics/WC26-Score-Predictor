
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MainNav } from "@/components/layout/main-nav"
import { Bell, Loader2, CheckCircle2, Filter, Trash2, Calendar, Trophy, Zap, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DateTime } from "luxon"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { ProfileSheet } from "@/components/profile/profile-sheet"
import { NotificationBell } from "@/components/layout/notification-bell"
import { ModeToggle } from "@/components/mode-toggle"
import Image from "next/image"

type FilterType = "all" | "unread" | "match" | "points" | "admin"

export default function NotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>("all")
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    fetchNotifications()

    const channel = supabase
      .channel('notifications-history')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => fetchNotifications())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, filter])

  const fetchNotifications = async () => {
    if (!user) return
    setLoading(true)
    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (filter === "unread") query = query.eq("is_read", false)
    if (filter === "match") query = query.in("type", ["team_scored", "scorer_updated", "fixture_time_updated"])
    if (filter === "points") query = query.in("type", ["bonus_points", "rank_changed"])
    if (filter === "admin") query = query.in("type", ["manual_admin", "app_update"])

    const { data } = await query
    setNotifications(data || [])
    setLoading(false)
  }

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id)
    fetchNotifications()
  }

  const markAllAsRead = async () => {
    if (!user) return
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false)
    fetchNotifications()
  }

  const getIcon = (type: string) => {
    switch(type) {
      case 'team_scored': return <Trophy className="h-4 w-4 text-primary" />
      case 'bonus_points': return <Zap className="h-4 w-4 text-yellow-500" />
      case 'prediction_reminder': return <Calendar className="h-4 w-4 text-blue-500" />
      case 'manual_admin': return <MessageSquare className="h-4 w-4 text-purple-500" />
      default: return <Bell className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      <MainNav />
      <header className="px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex justify-between items-center h-14">
          <div className="flex items-center gap-3">
             <div className="relative h-6 w-6 shrink-0">
               <Image src="/logo.png" alt="Arena Logo" fill className="object-contain" />
             </div>
             <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none">
                NOTIFICATION <span className="text-primary">CENTER</span>
             </h1>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <NotificationBell />
            <ProfileSheet />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6 mt-4">
        <div className="sticky top-[88px] z-30 bg-background/95 backdrop-blur-xl py-2">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
            <TabsList className="grid grid-cols-5 h-12 rounded-2xl bg-muted p-1">
              <TabsTrigger value="all" className="rounded-xl text-[9px] font-black uppercase tracking-tighter data-[state=active]:bg-primary">All</TabsTrigger>
              <TabsTrigger value="unread" className="rounded-xl text-[9px] font-black uppercase tracking-tighter data-[state=active]:bg-primary">New</TabsTrigger>
              <TabsTrigger value="match" className="rounded-xl text-[9px] font-black uppercase tracking-tighter data-[state=active]:bg-primary">Match</TabsTrigger>
              <TabsTrigger value="points" className="rounded-xl text-[9px] font-black uppercase tracking-tighter data-[state=active]:bg-primary">Points</TabsTrigger>
              <TabsTrigger value="admin" className="rounded-xl text-[9px] font-black uppercase tracking-tighter data-[state=active]:bg-primary">System</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex justify-between items-center px-2">
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
            {notifications.length} Alerts Found
          </p>
          {notifications.some(n => !n.is_read) && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-[10px] font-black uppercase text-primary hover:text-primary-foreground hover:bg-primary"
            >
              Mark all as read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
             <Loader2 className="h-8 w-8 text-primary animate-spin" />
             <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em]">Syncing Feed...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-32 text-center bg-card rounded-[2.5rem] border border-dashed border-border shadow-inner">
             <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
             <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">No notifications to show</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div 
                key={n.id} 
                onClick={() => !n.is_read && markAsRead(n.id)}
                className={cn(
                  "p-6 bg-card rounded-[2rem] border transition-all hover:shadow-xl cursor-pointer group relative overflow-hidden",
                  n.is_read ? "border-border" : "border-primary/30 shadow-lg"
                )}
              >
                {!n.is_read && <div className="absolute top-0 left-0 w-full h-1 bg-primary" />}
                <div className="flex gap-4 items-start">
                  <div className={cn(
                    "p-3 rounded-2xl shrink-0 transition-all",
                    n.is_read ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  )}>
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between items-start gap-2">
                       <h3 className="font-black text-xs uppercase italic tracking-tight text-foreground group-hover:text-primary transition-colors">
                        {n.title}
                       </h3>
                       <span className="text-[8px] font-black text-muted-foreground uppercase bg-muted px-2 py-0.5 rounded-full whitespace-nowrap">
                         {DateTime.fromISO(n.created_at).toRelative()}
                       </span>
                    </div>
                    <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">
                      {n.body}
                    </p>
                  </div>
                  {!n.is_read && <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
