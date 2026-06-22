
"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/hooks/use-auth"
import { MainNav } from "@/components/layout/main-nav"
import { createClient } from "@/lib/supabase/client"
import { Send, Loader2, MessageSquare, Zap } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getTeamFlagUrl } from "@/lib/team-flags"
import { DateTime } from "luxon"
import { ProfileSheet } from "@/components/profile/profile-sheet"
import { PwaInstallButton } from "@/components/pwa-install-button"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
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
      }, (payload) => {
        if (typeof window !== 'undefined' && document.visibilityState === 'hidden') {
          if (Notification.permission === 'granted') {
             new Notification('New Arena Message', {
               body: 'Someone just posted in the Arena Chat!',
               icon: '/logo.png'
             });
          }
        }
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

  const getInitials = (name?: string) => {
    if (!name) return "??"
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  return (
    <div className="min-h-screen bg-gray-50 text-foreground flex flex-col">
      <MainNav />
      <header className="px-6 py-4 bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex justify-between items-center h-14">
          <div>
            <h1 className="text-xl font-black italic tracking-tighter flex items-center gap-2 text-gray-900 leading-none uppercase">
              <div className="relative h-6 w-6 shrink-0">
                <Image src="/logo.png" alt="Arena Logo" fill className="object-contain" />
              </div>
              ARENA <span className="text-primary">CHAT</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
               <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest">Global Discussion</p>
               {stats && (
                 <div className="flex items-center gap-1.5">
                   <span className="h-0.5 w-0.5 rounded-full bg-gray-200" />
                   <span className="text-[9px] font-black text-primary uppercase italic">Rank #{stats.rank}</span>
                   <span className="text-[9px] font-black text-gray-900 uppercase">({stats.points} pts)</span>
                   <span className="h-0.5 w-0.5 rounded-full bg-gray-200" />
                   <div className="flex items-center gap-1 bg-yellow-50 px-1.5 py-0.5 rounded-full border border-yellow-100">
                      <Zap className="h-2 w-2 text-yellow-500 fill-yellow-500" />
                      <span className="text-[8px] font-black text-yellow-600">{stats.lifelines}</span>
                   </div>
                 </div>
               )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PwaInstallButton />
            <ProfileSheet />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 flex flex-col h-[calc(100vh-160px)] overflow-hidden mb-32 md:mb-0">
        <div className="flex-1 bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Connecting to Arena...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-30">
                <MessageSquare className="h-12 w-12 text-gray-300" />
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">No messages yet.<br/>Be the first to rally the fans!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg) => {
                  const isOwnMessage = msg.user_id === user?.id
                  const flagUrl = getTeamFlagUrl(msg.favorite_team)
                  
                  return (
                    <div 
                      key={msg.id} 
                      className={cn(
                        "flex gap-3",
                        isOwnMessage ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <Avatar className="h-10 w-10 border-2 border-white shadow-md shrink-0">
                        {flagUrl ? (
                          <AvatarImage src={flagUrl} className="object-cover" />
                        ) : (
                          <AvatarFallback className="bg-primary/5 text-primary font-black text-[10px]">
                            {getInitials(msg.display_name)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      
                      <div className={cn(
                        "flex flex-col space-y-1 max-w-[75%]",
                        isOwnMessage ? "items-end" : "items-start"
                      )}>
                        <div className="flex items-center gap-2 px-1">
                          <span className="text-[9px] font-black uppercase text-gray-400 tracking-tight">
                            {msg.display_name || "Unknown Fan"}
                          </span>
                          <span className="text-[8px] font-bold text-gray-300">
                            {DateTime.fromISO(msg.created_at).toFormat('HH:mm')}
                          </span>
                        </div>
                        
                        <div className={cn(
                          "px-5 py-3 rounded-2xl text-sm font-medium shadow-sm leading-relaxed",
                          isOwnMessage 
                            ? "bg-primary text-black rounded-tr-none" 
                            : "bg-gray-100 text-gray-900 rounded-tl-none"
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

          <div className="p-4 bg-gray-50 border-t border-gray-100">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                placeholder="Message the Arena..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={sending}
                maxLength={300}
                className="h-14 rounded-2xl border-gray-100 bg-white font-bold px-6 shadow-inner"
              />
              <Button 
                type="submit" 
                disabled={!newMessage.trim() || sending}
                className="h-14 w-14 rounded-2xl bg-primary text-black hover:bg-black hover:text-primary shadow-lg transition-all active:scale-95 border-2 border-primary shrink-0"
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
