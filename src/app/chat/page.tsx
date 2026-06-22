
"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/hooks/use-auth"
import { MainNav } from "@/components/layout/main-nav"
import { createClient } from "@/lib/supabase/client"
import { Send, Loader2, MessageSquare, Zap, Trophy } from "lucide-react"
import { UserAvatar } from "@/components/user-avatar"
import { DateTime } from "luxon"
import { ProfileSheet } from "@/components/profile/profile-sheet"
import { PwaInstallButton } from "@/components/pwa-install-button"
import { ModeToggle } from "@/components/mode-toggle"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { NotificationBell } from "@/components/layout/notification-bell"
import { cn } from "@/lib/utils"
import Image from "next/image"

export default function ChatPage() {
  const { user, stats } = useAuth()
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchMessages()
    
    const channel = supabase
      .channel('arena-chat')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'arena_messages' 
      }, () => {
        fetchMessages()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("arena_chat_feed")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(100)
      
      if (error) throw error
      setMessages(data || [])
    } catch (err: any) {
      console.error("Chat fetch error:", err?.message || err)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user || sending) return
    
    const messageText = newMessage.trim().substring(0, 300)
    setNewMessage("")
    setSending(true)

    try {
      const { error } = await supabase
        .from("arena_messages")
        .insert({
          user_id: user.id,
          message: messageText
        })
      
      if (error) throw error
    } catch (err: any) {
      console.error("Message send error:", err?.message || err)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <MainNav />
      <header className="px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex justify-between items-center h-14">
          <div>
            <h1 className="text-xl font-black italic tracking-tighter flex items-center gap-2 text-foreground leading-none uppercase">
              <div className="relative h-6 w-6 shrink-0">
                <Image src="/logo.png" alt="Arena Logo" fill className="object-contain" />
              </div>
              ARENA <span className="text-primary">CHAT</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
               <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">Global Discussion</p>
               {stats && (
                 <div className="flex items-center gap-1.5">
                   <span className="h-0.5 w-0.5 rounded-full bg-border" />
                   <span className="text-[9px] font-black text-primary uppercase italic">Rank #{stats.rank}</span>
                   <span className="text-[9px] font-black text-foreground uppercase">({stats.points} pts)</span>
                   <span className="h-0.5 w-0.5 rounded-full bg-border" />
                   <div className="flex items-center gap-1 bg-yellow-500/10 px-1.5 py-0.5 rounded-full border border-yellow-500/20">
                      <Zap className="h-2 w-2 text-yellow-500 fill-yellow-500" />
                      <span className="text-[8px] font-black text-yellow-500">{stats.lifelines}</span>
                   </div>
                 </div>
               )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <NotificationBell />
            <PwaInstallButton />
            <ProfileSheet />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 flex flex-col h-[calc(100vh-160px)] overflow-hidden mb-32 md:mb-0">
        <div className="flex-1 bg-card rounded-[2.5rem] shadow-2xl border border-border overflow-hidden flex flex-col transition-all hover:shadow-primary/5">
          <ScrollArea className="flex-1 p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Connecting to Arena...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-30">
                <MessageSquare className="h-12 w-12 text-muted-foreground" />
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">No messages yet.<br/>Be the first to rally the fans!</p>
              </div>
            ) : (
              <div className="space-y-8">
                {messages.map((msg) => {
                  const isOwnMessage = msg.user_id === user?.id
                  
                  return (
                    <div 
                      key={msg.id} 
                      className={cn(
                        "flex gap-4 items-end",
                        isOwnMessage ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <UserAvatar profile={msg} className="h-10 w-10 shrink-0 shadow-lg" />
                      
                      <div className={cn(
                        "flex flex-col space-y-1.5 max-w-[75%]",
                        isOwnMessage ? "items-end text-right" : "items-start text-left"
                      )}>
                        <div className="flex items-center gap-2 px-1">
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-tight",
                            isOwnMessage ? "text-primary italic" : "text-muted-foreground"
                          )}>
                            {msg.display_name || "Unknown Fan"}
                          </span>
                          <span className="text-[8px] font-bold text-muted-foreground/50">
                            {DateTime.fromISO(msg.created_at).toFormat('HH:mm')}
                          </span>
                        </div>
                        
                        <div className={cn(
                          "px-6 py-4 rounded-[2rem] text-sm font-semibold shadow-md leading-relaxed transition-all",
                          isOwnMessage 
                            ? "bg-primary text-primary-foreground rounded-br-none border-2 border-primary/20" 
                            : "bg-muted text-foreground rounded-bl-none border border-border/50"
                        )}>
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          <div className="p-6 bg-muted/30 border-t border-border/50 backdrop-blur-sm">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <Input
                placeholder="Message the Arena..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={sending}
                maxLength={300}
                className="h-14 rounded-full border-border bg-background font-bold px-8 shadow-inner focus:ring-primary/20"
              />
              <Button 
                type="submit" 
                disabled={!newMessage.trim() || sending}
                className="h-14 w-14 rounded-full bg-primary text-primary-foreground hover:bg-black hover:text-primary shadow-xl transition-all active:scale-90 border-2 border-primary shrink-0"
              >
                {sending ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-6 w-6" />}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
