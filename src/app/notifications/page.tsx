"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MainNav } from "@/components/layout/main-nav"
import { Bell, Loader2, Trophy, Zap, MessageSquare, Calendar, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { NotificationBell } from "@/components/layout/notification-bell"
import { ModeToggle } from "@/components/mode-toggle"
import Image from "next/image"
import { DateTime } from "luxon"

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
      case 'team_scored': return <Trophy className="h-5 w-5 text-primary" />
      case 'bonus_points': return <Zap className="h-5 w-5 text-primary" />
      case 'prediction_reminder': return <Calendar className="h-5 w-5 text-blue-500" />
      case 'manual_admin': return <MessageSquare className="h-5 w-5 text-purple-500" />
      case 'rank_changed': return <Zap className="h-5 w-5 text-yellow-500" />
      default: return <Bell className="h-5 w-5 text-muted-foreground" />
    }
  }

  return (
    <div className="min-h-screen pb-32">
      <MainNav />
      <header className="premium-header">
        <div className="max-w-2xl mx-auto flex justify-between items-center h-14">
          <div className="flex items-center gap-3 overflow-visible">
             <div className="relative h-10 w-10 shrink-0 drop-shadow-xl">
               <Image src="/logo.png" alt="Arena Logo" fill className="object-contain" />
             </div>
             <div className="overflow-visible">
               <h1 className="text-xl leading-none uppercase overflow-visible">
                  <span className="premium-gold-gradient-heading">ARENA</span> <span className="text-foreground font-black italic tracking-tight">ALERTS</span>
               </h1>
               <p className="text-[9px] uppercase font-black text-muted-foreground tracking-[0.2em] mt-0.5">Notification History</p>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <NotificationBell />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-8 mt-6">
        <div className="sticky top-[88px] z-30 bg-background/90 backdrop-blur-xl py-4 -mx-4 px-4 border-b border-border/50">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
            <TabsList className="grid grid-cols-5 h-14 rounded-[1.5rem] bg-muted/40 p-1.5 border border-border/40 shadow-sm">
              <TabsTrigger value="all" className="soft-button py-2 rounded-full data-[state=active]:premium-gold-gradient-bg data-[state=active]:text-black transition-all">All</TabsTrigger>
              <TabsTrigger value="unread" className="soft-button py-2 rounded-full data-[state=active]:premium-gold-gradient-bg data-[state=active]:text-black transition-all">New</TabsTrigger>
              <TabsTrigger value="match" className="soft-button py-2 rounded-full data-[state=active]:premium-gold-gradient-bg data-[state=active]:text-black transition-all">Match</TabsTrigger>
              <TabsTrigger value="points" className="soft-button py-2 rounded-full data-[state=active]:premium-gold-gradient-bg data-[state=active]:text-black transition-all">Score</TabsTrigger>
              <TabsTrigger value="admin" className="soft-button py-2 rounded-full data-[state=active]:premium-gold-gradient-bg data-[state=active]:text-black transition-all">System</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex justify-between items-center px-4">
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em] opacity-60">
            {notifications.length} {notifications.length === 1 ? 'Alert' : 'Alerts'} FOUND
          </p>
          {notifications.some(n => !n.is_read) && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-[9px] font-black uppercase premium-gold-gradient-text hover:bg-primary/5 rounded-full px-4 h-8 transition-all"
            >
              Clear All New
            </Button>
          )}
        </div>

        {loading ? (
          <div className="py-40 flex flex-col items-center justify-center gap-4 opacity-50">
             <Loader2 className="h-10 w-10 text-primary animate-spin" />
             <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.4em]">Syncing Feed...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-40 text-center app-surface-panel border-2 border-dashed border-border/50 mx-4">
             <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-6 opacity-10" />
             <p className="text-[11px] font-black uppercase text-muted-foreground tracking-[0.4em]">Quiet in the Arena</p>
          </div>
        ) : (
          <div className="space-y-4 px-2 pb-20 overflow-visible">
            {notifications.map((n) => (
              <div 
                key={n.id} 
                onClick={() => !n.is_read && markAsRead(n.id)}
                className={cn(
                  "app-glass-card p-6 group cursor-pointer relative border-border/40 transition-all hover:scale-[1.01] hover:bg-card/80 overflow-visible",
                  n.is_read ? "opacity-60" : "ring-1 ring-primary/20 bg-primary/[0.02]"
                )}
              >
                {!n.is_read && <div className="absolute top-0 left-0 w-1 h-full premium-gold-gradient-bg rounded-l-full" />}
                <div className="flex gap-6 items-center overflow-visible">
                  <div className={cn(
                    "p-4 rounded-[1.2rem] shrink-0 transition-all shadow-lg",
                    n.is_read ? "bg-muted text-muted-foreground" : "premium-gold-gradient-bg text-black"
                  )}>
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0 overflow-visible">
                    <div className="flex justify-between items-start gap-4 overflow-visible">
                       <h3 className="text-sm overflow-visible">
                        <span className="premium-gold-gradient-heading">{n.title}</span>
                       </h3>
                    </div>
                    <p className="text-[12px] font-medium text-muted-foreground leading-relaxed mt-0.5">
                      {n.body}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                     <span className="text-[9px] font-black text-muted-foreground uppercase bg-muted/50 px-3 py-1 rounded-full whitespace-nowrap opacity-60">
                       {DateTime.fromISO(n.created_at).toRelative()}
                     </span>
                     {!n.is_read && <Zap className="h-4 w-4 text-primary animate-in zoom-in duration-500 fill-primary" />}
                     {n.is_read && <ChevronRight className="h-4 w-4 text-muted-foreground/20" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
