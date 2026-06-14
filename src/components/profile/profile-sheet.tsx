"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LogOut, Mail, Share2, ShieldCheck, Edit2, Check, X, Flag, Trophy, Zap, Target } from "lucide-react"
import { copyToClipboard } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { getTeamFlagUrl, COUNTRIES } from "@/lib/team-flags"
import Link from "next/link"
import Image from "next/image"

export function ProfileSheet() {
  const { user, profile, stats, logout, updateDisplayName, updateFavoriteTeam } = useAuth()
  const { toast } = useToast()
  
  const [isEditing, setIsEditing] = useState(false)
  const [newName, setNewName] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (profile?.display_name) {
      setNewName(profile.display_name)
    }
  }, [profile?.display_name])

  if (!user) return null

  const getInitials = (name?: string) => {
    if (!name) return "??"
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  const initials = getInitials(profile?.display_name)
  const flagUrl = getTeamFlagUrl(profile?.favorite_team)
  const isSuperadmin = profile?.role === 'superadmin'

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}`
    const success = await copyToClipboard(shareUrl)
    if (success) {
      toast({
        title: "Link Copied",
        description: "Join the predictor now!",
      })
    }
  }

  const handleUpdateName = async () => {
    const trimmedName = newName.trim()
    if (trimmedName.length < 3) {
      toast({ variant: "destructive", title: "Invalid Name", description: "At least 3 characters required." })
      return
    }
    setIsSaving(true)
    try {
      await updateDisplayName(trimmedName)
      setIsEditing(false)
      toast({ title: "Updated", description: "Display name changed." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message })
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateTeam = async (team: string) => {
    try {
      await updateFavoriteTeam(team)
      toast({ title: "Flag Updated", description: "You are now representing " + team })
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Update Failed", 
        description: error.message 
      })
    }
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 bg-white border shadow-sm hover:scale-105 transition-all">
          <Avatar className="h-8 w-8">
            {flagUrl ? (
              <AvatarImage src={flagUrl} className="object-cover" />
            ) : (
              <AvatarFallback className="bg-primary/10 text-primary font-black text-[10px]">
                {initials}
              </AvatarFallback>
            )}
          </Avatar>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[320px] sm:w-[400px] p-0 border-l-0 overflow-y-auto">
        <SheetHeader className="p-8 bg-primary text-white">
          <SheetTitle className="text-white font-black italic uppercase tracking-tighter text-2xl">
            My Profile
          </SheetTitle>
        </SheetHeader>
        
        <div className="p-6 space-y-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-white shadow-2xl">
                {flagUrl ? (
                  <AvatarImage src={flagUrl} className="object-cover" />
                ) : (
                  <AvatarFallback className="bg-gray-50 text-primary font-black text-2xl">
                    {initials}
                  </AvatarFallback>
                )}
              </Avatar>
            </div>
            
            <div className="space-y-1 w-full flex flex-col items-center">
              {isEditing ? (
                <div className="flex items-center gap-2 w-full max-w-[240px]">
                  <Input 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="h-10 text-center font-bold"
                    disabled={isSaving}
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-10 w-10 text-green-600" onClick={handleUpdateName} disabled={isSaving}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-10 w-10 text-gray-400" onClick={() => setIsEditing(false)} disabled={isSaving}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black uppercase italic text-gray-900 leading-tight">
                    {profile?.display_name}
                  </h3>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400" onClick={() => setIsEditing(true)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <p className="text-xs font-bold text-gray-400 flex items-center justify-center gap-1.5 uppercase tracking-widest mt-1">
                <Mail className="h-3 w-3" /> {user.email}
              </p>
            </div>

            <div className="w-full space-y-3 pt-4 border-t border-gray-100 text-left">
               <div className="flex items-center gap-2">
                  <Flag className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">National Representation</span>
               </div>
               <Select value={profile?.favorite_team || ""} onValueChange={handleUpdateTeam}>
                  <SelectTrigger className="w-full h-12 rounded-2xl border-gray-100 bg-gray-50/50">
                    <SelectValue placeholder="Select National Team" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country} value={country}>
                        <div className="flex items-center gap-3">
                          <div className="relative h-4 w-6 rounded-sm overflow-hidden border">
                            <Image src={getTeamFlagUrl(country)!} alt="" fill className="object-cover" />
                          </div>
                          <span className="font-bold text-xs uppercase">{country}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
               </Select>
            </div>
            
            <div className="flex flex-wrap justify-center gap-2 pt-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleShare}
                className="rounded-full h-9 px-6 font-black uppercase text-[10px] tracking-widest gap-2"
              >
                <Share2 className="h-3 w-3" /> Share Predictor
              </Button>
              
              {isSuperadmin && (
                <Link href="/admin">
                  <Button variant="outline" size="sm" className="rounded-full h-9 px-6 font-black uppercase text-[10px] tracking-widest gap-2">
                    <ShieldCheck className="h-3 w-3" /> Admin Panel
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-5 bg-primary text-white rounded-3xl text-center space-y-1 shadow-xl shadow-primary/20">
               <div className="flex items-center justify-center gap-2 opacity-80">
                  <Trophy className="h-3 w-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Global Arena Rank</p>
               </div>
               <span className="text-4xl font-black italic">#{stats?.rank || "--"}</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="p-5 bg-gray-50 border border-gray-100 rounded-3xl flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <div className="bg-white p-2 rounded-xl border border-gray-100">
                      <Trophy className="h-4 w-4 text-primary" />
                   </div>
                   <div className="text-left">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Points</p>
                      <span className="text-xl font-black text-gray-900">{stats?.points || "0"}</span>
                   </div>
                </div>
              </div>

              <div className="p-5 bg-gray-50 border border-gray-100 rounded-3xl flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <div className="bg-white p-2 rounded-xl border border-gray-100">
                      <Target className="h-4 w-4 text-green-500" />
                   </div>
                   <div className="text-left">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Prediction Points</p>
                      <span className="text-xl font-black text-gray-900">{stats?.predictionPoints || "0"}</span>
                   </div>
                </div>
              </div>

              <div className="p-5 bg-gray-50 border border-gray-100 rounded-3xl flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <div className="bg-white p-2 rounded-xl border border-gray-100">
                      <Zap className="h-4 w-4 text-blue-500" />
                   </div>
                   <div className="text-left">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Late Join Bonus</p>
                      <span className="text-xl font-black text-gray-900">{stats?.startingPoints || "0"}</span>
                   </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100">
            <Button variant="destructive" onClick={() => logout()} className="w-full rounded-2xl h-14 font-black uppercase tracking-widest text-xs gap-2">
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
