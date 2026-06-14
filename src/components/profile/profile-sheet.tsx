"use client"

import { useAuth } from "@/hooks/use-auth"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { User, LogOut, Mail, Trophy, Star, Share2 } from "lucide-react"
import { copyToClipboard } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

export function ProfileSheet() {
  const { user, profile, stats, logout } = useAuth()
  const { toast } = useToast()

  if (!user) return null

  const initials = profile?.display_name?.substring(0, 2).toUpperCase() || "??"

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}?ref=${user.id}`
    const success = await copyToClipboard(shareUrl)
    if (success) {
      toast({
        title: "Link Copied",
        description: "Your invite link is ready to share!",
      })
    } else {
      toast({
        variant: "destructive",
        title: "Copy Failed",
        description: "Please copy the URL manually from your browser.",
      })
    }
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary font-black text-[10px]">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[320px] sm:w-[400px] p-0 border-l-0">
        <SheetHeader className="p-8 bg-primary text-white">
          <SheetTitle className="text-white font-black italic uppercase tracking-tighter text-2xl">
            My Profile
          </SheetTitle>
        </SheetHeader>
        
        <div className="p-6 space-y-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <Avatar className="h-24 w-24 border-4 border-white shadow-xl">
              <AvatarFallback className="bg-gray-50 text-primary font-black text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h3 className="text-xl font-black uppercase italic text-gray-900 leading-tight">
                {profile?.display_name}
              </h3>
              <p className="text-xs font-bold text-gray-400 flex items-center justify-center gap-1.5 uppercase tracking-widest">
                <Mail className="h-3 w-3" /> {user.email}
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleShare}
              className="rounded-full h-9 px-6 font-black uppercase text-[10px] tracking-widest gap-2"
            >
              <Share2 className="h-3 w-3" /> Share Predictor
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 bg-primary/5 border border-primary/10 rounded-3xl text-center space-y-1">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest opacity-60">Global Rank</p>
              <div className="flex items-baseline justify-center gap-0.5">
                <span className="text-3xl font-black italic text-primary">#{stats?.rank || "--"}</span>
              </div>
            </div>
            <div className="p-5 bg-gray-50 border border-gray-100 rounded-3xl text-center space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Points</p>
              <div className="flex items-baseline justify-center gap-0.5">
                <span className="text-3xl font-black italic text-gray-900">{stats?.points || "0"}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
             <div className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <div className="flex-1">
                  <p className="text-xs font-black uppercase text-gray-900">Career Best</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Rank #1 in WC22</p>
                </div>
             </div>
             <div className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl">
                <Star className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-xs font-black uppercase text-gray-900">Elite Member</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Since Jan 2024</p>
                </div>
             </div>
          </div>

          <div className="pt-6 border-t border-gray-100">
            <Button 
              variant="destructive" 
              onClick={() => logout()}
              className="w-full rounded-2xl h-14 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg"
            >
              <LogOut className="h-4 w-4" /> Sign Out of Arena
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
