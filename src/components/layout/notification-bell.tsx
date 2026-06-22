
"use client"

import { useState, useEffect } from "react"
import { Bell, BellRing, Loader2, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DateTime } from "luxon"
import { cn } from "@/lib/utils"
import Link from "next/link"

export function NotificationBell() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!user) return

    fetchNotifications()

    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchNotifications()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  const fetchNotifications = async () => {
    if (!user) return
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)
    
    if (!error && data) {
      setNotifications(data)
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: 'exact', head: true })
        .eq("user_id", user.id)
        .eq("is_read", false)
      setUnreadCount(count || 0)
    }
    setLoading(false)
  }

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
    if (!error) fetchNotifications()
  }

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user?.id)
      .eq("is_read", false)
    if (!error) fetchNotifications()
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full border bg-background shadow-sm">
          {unreadCount > 0 ? (
            <BellRing className="h-4 w-4 text-primary animate-pulse" />
          ) : (
            <Bell className="h-4 w-4 text-muted-foreground" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white ring-2 ring-background shadow-lg">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[320px] sm:w-[400px] p-0 border-l-0 flex flex-col">
        <SheetHeader className="p-8 bg-gray-900 text-white">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-white font-black italic uppercase tracking-tighter text-2xl">
              Alerts
            </SheetTitle>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="text-[9px] font-black uppercase text-primary hover:text-white hover:bg-white/10"
              >
                Clear All
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
              <span className="text-[10px] font-black uppercase text-muted-foreground">Syncing feed...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-8 opacity-40">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-relaxed">
                Quiet in the Arena.<br/>Notifications for goals and scores will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  onClick={() => !n.is_read && markAsRead(n.id)}
                  className={cn(
                    "p-6 transition-colors cursor-pointer group",
                    n.is_read ? "bg-background" : "bg-primary/5 border-l-4 border-l-primary"
                  )}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <h4 className="text-xs font-black uppercase italic tracking-tight text-foreground group-hover:text-primary transition-colors">
                        {n.title}
                      </h4>
                      <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">
                        {n.body}
                      </p>
                      <span className="text-[8px] font-black text-muted-foreground/60 uppercase tracking-widest mt-2 block">
                        {DateTime.fromISO(n.created_at).toRelative()}
                      </span>
                    </div>
                    {!n.is_read && <CheckCircle2 className="h-3 w-3 text-primary mt-1" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 bg-muted/30 border-t border-border">
           <Link href="/notifications" className="block">
              <Button variant="outline" className="w-full h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 bg-background">
                View All History
              </Button>
           </Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}
