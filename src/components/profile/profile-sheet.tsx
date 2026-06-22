"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LogOut, Mail, Share2, ShieldCheck, Edit2, Check, X, Flag, Trophy, Zap, UserCircle, Lock, Loader2 } from "lucide-react"
import { copyToClipboard } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { getTeamFlagUrl, COUNTRIES } from "@/lib/team-flags"
import { PROFILE_ICON_PRESETS } from "@/lib/profile-icons"
import { NotificationToggle } from "./notification-toggle"
import { UserAvatar } from "@/components/user-avatar"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

export function ProfileSheet() {
  const { user, profile, stats, logout, updateDisplayName, updateFavoriteTeam, updateProfileIcon, updatePassword } = useAuth()
  const { toast } = useToast()
  
  const [isEditing, setIsEditing] = useState(false)
  const [newName, setNewName] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Password change state
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  useEffect(() => {
    if (profile?.display_name) {
      setNewName(profile.display_name)
    }
  }, [profile?.display_name])

  if (!user) return null

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

  const handleUpdateIcon = async (key: string | null) => {
    try {
      await updateProfileIcon(key)
      toast({ title: "Icon Updated", description: key ? "Avatar changed!" : "Switched to team flag." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message })
    }
  }

  const handlePasswordUpdate = async () => {
    if (!newPassword || !confirmNewPassword) {
      toast({ variant: "destructive", title: "Required", description: "Please fill in both fields." })
      return
    }
    if (newPassword !== confirmNewPassword) {
      toast({ variant: "destructive", title: "Mismatch", description: "Passwords do not match." })
      return
    }
    if (newPassword.length < 6) {
      toast({ variant: "destructive", title: "Too Short", description: "Password must be at least 6 characters." })
      return
    }
    
    setIsUpdatingPassword(true)
    try {
      await updatePassword(newPassword)
      toast({ title: "Success", description: "Password updated successfully." })
      setIsChangingPassword(false)
      setNewPassword("")
      setConfirmNewPassword("")
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 bg-background border shadow-sm hover:scale-105 transition-all">
          <UserAvatar profile={profile} className="h-8 w-8" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[420px] w-[92vw] p-0 border-0 bg-transparent shadow-none overflow-hidden rounded-[2.5rem]">
        <div className="bg-white dark:bg-slate-950 border border-border/50 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-colors">
          <DialogHeader className="p-8 premium-gold-gradient-bg shrink-0 relative">
            <DialogTitle className="text-black font-black italic uppercase tracking-tighter text-2xl">
              Arena Profile
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1" hideScrollbar>
            <div className="p-6 space-y-8 pb-12">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  <UserAvatar profile={profile} className="h-28 w-24 border-4 border-primary/20 shadow-2xl rounded-full" fallbackClassName="text-3xl" />
                  <div className="absolute -bottom-1 -right-1 premium-gold-gradient-bg text-black rounded-full px-2 py-0.5 text-[9px] font-black uppercase italic shadow-lg border-2 border-background">
                    #{stats?.rank || "--"}
                  </div>
                </div>
                
                <div className="space-y-1 w-full flex flex-col items-center">
                  {isEditing ? (
                    <div className="flex items-center gap-2 w-full max-w-[240px]">
                      <Input 
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="h-12 text-center font-black uppercase tracking-tight rounded-xl border-primary/20 bg-muted/50 text-foreground"
                        disabled={isSaving}
                        autoFocus
                      />
                      <Button size="icon" className="h-10 w-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white" onClick={handleUpdateName} disabled={isSaving}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl text-muted-foreground" onClick={() => setIsEditing(false)} disabled={isSaving}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-black uppercase italic premium-gold-gradient-text tracking-tighter leading-tight">
                        {profile?.display_name}
                      </h3>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors" onClick={() => setIsEditing(true)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-300 flex items-center justify-center gap-1.5 uppercase tracking-[0.2em] mt-1">
                    <Mail className="h-3 w-3 opacity-60" /> {user.email}
                  </p>
                </div>

                <div className="w-full pt-6 space-y-6">
                   <div className="rounded-[2rem] p-6 flex justify-around items-center gap-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm">
                      <div className="text-center space-y-0.5">
                         <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Points</span>
                         <p className="text-2xl font-black italic tracking-tighter premium-gold-gradient-text leading-none">{stats?.points || "0"}</p>
                      </div>
                      <div className="h-10 w-px bg-slate-200 dark:bg-white/10" />
                      <div className="text-center space-y-0.5">
                         <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Lifelines</span>
                         <div className="flex items-center gap-1 justify-center">
                            <Zap className="h-3.5 w-3.5 text-primary fill-primary" />
                            <p className="text-2xl font-black italic tracking-tighter premium-gold-gradient-text leading-none">{stats?.lifelines || "0"}</p>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="w-full space-y-4 pt-4 text-left">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCircle className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">Avatar Presets</span>
                      </div>
                      {profile?.profile_icon_key && (
                        <Button 
                          variant="ghost" 
                          onClick={() => handleUpdateIcon(null)}
                          className="h-7 px-3 text-[9px] font-black uppercase premium-gold-gradient-text border border-primary/20 rounded-full hover:bg-primary/5 transition-all"
                        >
                          Use Nation Flag
                        </Button>
                      )}
                   </div>
                   <div className="grid grid-cols-5 gap-3 p-4 bg-slate-100 dark:bg-white/5 rounded-[2rem] border border-slate-200 dark:border-white/10">
                      {PROFILE_ICON_PRESETS.map((icon) => (
                        <button
                          key={icon.key}
                          onClick={() => handleUpdateIcon(icon.key)}
                          className={cn(
                            "relative aspect-square rounded-2xl overflow-hidden border-2 transition-all hover:scale-105 active:scale-95",
                            profile?.profile_icon_key === icon.key 
                              ? "border-primary shadow-lg ring-2 ring-primary/20 scale-105 z-10 opacity-100" 
                              : "border-transparent opacity-80 grayscale-[0.2] hover:grayscale-0 hover:opacity-100"
                          )}
                        >
                          <Image src={icon.imagePath} alt={icon.label} fill className="object-cover" />
                        </button>
                      ))}
                   </div>
                </div>

                <div className="w-full space-y-3 text-left">
                   <div className="flex items-center gap-2">
                      <Flag className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">Representation</span>
                   </div>
                   <Select value={profile?.favorite_team || ""} onValueChange={handleUpdateTeam}>
                      <SelectTrigger className="w-full h-14 rounded-2xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-sm font-black uppercase text-xs italic tracking-tight text-foreground">
                        <SelectValue placeholder="Select National Team" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] rounded-2xl">
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country} value={country} className="rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className="relative h-4 w-6 rounded-sm overflow-hidden border border-border/30 shadow-sm">
                                <Image src={getTeamFlagUrl(country)!} alt="" fill className="object-cover" />
                              </div>
                              <span className="font-bold text-xs uppercase">{country}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                   </Select>
                </div>

                <div className="w-full space-y-4 pt-4 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">Arena Alerts</span>
                  </div>
                  <NotificationToggle />
                </div>
                
                <div className="flex flex-wrap justify-center gap-3 pt-6 border-t border-slate-200 dark:border-white/10 w-full">
                  <Button 
                    variant="outline" 
                    onClick={handleShare}
                    className="rounded-full h-12 flex-1 font-black uppercase text-[10px] tracking-widest gap-2 bg-white dark:bg-slate-900 text-foreground border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm"
                  >
                    <Share2 className="h-3.5 w-3.5 premium-gold-gradient-text" /> Invite Friends
                  </Button>
                  
                  {isSuperadmin && (
                    <Link href="/admin" className="flex-1">
                      <Button variant="outline" className="w-full rounded-full h-12 font-black uppercase text-[10px] tracking-widest gap-2 bg-black dark:bg-white text-white dark:text-black border-0 shadow-lg hover:opacity-90">
                        <ShieldCheck className="h-3.5 w-3.5 premium-gold-gradient-text" /> Admin Panel
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">Security</span>
                </div>
                {!isChangingPassword ? (
                  <Button 
                    variant="outline" 
                    onClick={() => setIsChangingPassword(true)}
                    className="w-full rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest gap-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-foreground"
                  >
                    <Lock className="h-3.5 w-3.5 opacity-60" /> Change Password
                  </Button>
                ) : (
                  <div className="space-y-4 p-5 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-primary/20">
                    <Input 
                      type="password" 
                      placeholder="New Password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="rounded-xl h-12 text-sm font-bold bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 text-foreground"
                    />
                    <Input 
                      type="password" 
                      placeholder="Confirm New Password" 
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="rounded-xl h-12 text-sm font-bold bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 text-foreground"
                    />
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1 rounded-xl h-12 premium-gold-gradient-bg text-black font-black text-[10px] uppercase tracking-widest shadow-lg hover:opacity-90"
                        onClick={handlePasswordUpdate}
                        disabled={isUpdatingPassword}
                      >
                        {isUpdatingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                      </Button>
                      <Button 
                        variant="ghost"
                        className="rounded-xl h-12 text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 hover:text-foreground transition-all"
                        onClick={() => {
                          setIsChangingPassword(false)
                          setNewPassword("")
                          setConfirmNewPassword("")
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-10">
                <Button variant="destructive" onClick={() => logout()} className="w-full rounded-3xl h-16 font-black uppercase tracking-[0.2em] text-xs gap-3 shadow-xl shadow-red-500/10 active:scale-95 transition-all">
                  <LogOut className="h-4 w-4" /> Sign Out
                </Button>
              </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}