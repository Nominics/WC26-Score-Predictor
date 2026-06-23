"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { MainNav } from "@/components/layout/main-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LogOut, Mail, Share2, ShieldCheck, Edit2, Check, X, Flag, Zap, UserCircle, Lock, Loader2, Trophy } from "lucide-react"
import { copyToClipboard, cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { getTeamFlagUrl, COUNTRIES } from "@/lib/team-flags"
import { PROFILE_ICON_PRESETS } from "@/lib/profile-icons"
import { NotificationToggle } from "@/components/profile/notification-toggle"
import { UserAvatar } from "@/components/user-avatar"
import { ModeToggle } from "@/components/mode-toggle"
import { NotificationBell } from "@/components/layout/notification-bell"
import Link from "next/link"
import Image from "next/image"
import { AppLoadingScreen } from "@/components/layout/app-loading-screen"

export default function ProfilePage() {
  const { user, profile, stats, loading: authLoading, logout, updateDisplayName, updateFavoriteTeam, updateProfileIcon, updatePassword } = useAuth()
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

  if (authLoading) return <AppLoadingScreen />
  if (!user) return null

  const isSuperadmin = profile?.role === 'superadmin'

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}`
    const success = await copyToClipboard(shareUrl)
    if (success) {
      toast({ title: "Link Copied", description: "Invite your friends to the Arena!" })
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
      toast({ variant: "destructive", title: "Update Failed", description: error.message })
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
    <div className="min-h-screen pb-32">
      <MainNav />
      <header className="premium-header">
        <div className="max-w-2xl mx-auto flex items-center justify-between h-14">
          <div className="flex items-center gap-3 overflow-visible">
            <div className="relative h-10 w-10 shrink-0 drop-shadow-xl">
              <Image src="/logo.png" alt="Arena Logo" fill className="object-contain" />
            </div>
            <div className="overflow-visible">
              <h1 className="text-xl leading-none flex items-center gap-1 uppercase overflow-visible">
                <span className="premium-gold-gradient-heading">ARENA</span> <span className="text-foreground font-black italic tracking-tight">IDENTITY</span>
              </h1>
              <p className="text-[9px] uppercase font-black text-muted-foreground tracking-[0.2em] mt-1">Profile & Settings</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <NotificationBell />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-8 mt-6">
        {/* Profile Card */}
        <div className="app-glass-card p-8 space-y-8 overflow-visible">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative overflow-visible">
              <UserAvatar profile={profile} className="h-28 w-28 border-4 border-primary/20 shadow-2xl" fallbackClassName="text-3xl" />
              <div className="absolute -bottom-1 -right-1 premium-gold-pill rounded-full px-3 py-1 text-[10px] border-2 border-background shadow-lg">
                RANK #{stats?.rank || "--"}
              </div>
            </div>
            
            <div className="space-y-1 w-full flex flex-col items-center overflow-visible">
              {isEditing ? (
                <div className="flex items-center gap-2 w-full max-w-[280px] animate-in zoom-in-95 duration-200">
                  <Input 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="h-12 text-center font-black uppercase tracking-tight rounded-xl border-primary/20 bg-muted/50"
                    disabled={isSaving}
                    autoFocus
                  />
                  <Button size="icon" className="h-10 w-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shrink-0" onClick={handleUpdateName} disabled={isSaving}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl text-muted-foreground shrink-0" onClick={() => setIsEditing(false)} disabled={isSaving}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 overflow-visible">
                  <h3 className="premium-gold-gradient-heading text-2xl">
                    {profile?.display_name}
                  </h3>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setIsEditing(true)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <p className="text-[11px] font-bold text-muted-foreground flex items-center justify-center gap-1.5 uppercase tracking-[0.2em] mt-1">
                <Mail className="h-3 w-3 opacity-60" /> {user.email}
              </p>
            </div>

            {/* Optimized Stat Pills */}
            <div className="w-full pt-6 overflow-visible">
               <div className="grid grid-cols-2 gap-3 w-full overflow-visible">
                  <div className="flex items-center justify-center gap-2 rounded-2xl bg-white/90 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-4 py-3 shadow-sm overflow-visible">
                     <Trophy className="h-4 w-4 text-primary" />
                     <span className="text-xl font-black premium-gold-gradient-number inline-block">{stats?.points || "0"}</span>
                     <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Pts</span>
                  </div>

                  <div className="flex items-center justify-center gap-2 rounded-2xl bg-white/90 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-4 py-3 shadow-sm overflow-visible">
                     <Zap className="h-4 w-4 text-primary fill-primary" />
                     <span className="text-xl font-black premium-gold-gradient-number inline-block">{stats?.lifelines || "0"}</span>
                     <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Lives</span>
                  </div>
               </div>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="space-y-3">
               <div className="flex items-center gap-2 px-1">
                  <Flag className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">National Representation</span>
               </div>
               <Select value={profile?.favorite_team || ""} onValueChange={handleUpdateTeam}>
                  <SelectTrigger className="w-full h-14 rounded-2xl border-border/50 bg-muted/20 font-black uppercase text-xs italic tracking-tight">
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

            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">System Alerts</span>
              </div>
              <NotificationToggle />
            </div>

            <div className="space-y-4">
               <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <UserCircle className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Avatar Presets</span>
                  </div>
                  {profile?.profile_icon_key && (
                    <Button 
                      variant="ghost" 
                      onClick={() => handleUpdateIcon(null)}
                      className="h-7 px-4 text-[9px] font-black uppercase premium-gold-gradient-text border border-primary/20 rounded-full hover:bg-primary/5"
                    >
                      Use Flag
                    </Button>
                  )}
               </div>
               <div className="grid grid-cols-5 gap-3 p-5 bg-muted/30 rounded-[2.5rem] border border-border/40">
                  {PROFILE_ICON_PRESETS.map((icon) => (
                    <button
                      key={icon.key}
                      onClick={() => handleUpdateIcon(icon.key)}
                      className={cn(
                        "relative aspect-square rounded-2xl overflow-hidden border-2 transition-all hover:scale-105 active:scale-95",
                        profile?.profile_icon_key === icon.key 
                          ? "premium-gold-ring shadow-xl scale-110 z-10" 
                          : "border-transparent opacity-60 grayscale hover:grayscale-0 hover:opacity-100"
                      )}
                    >
                      <Image src={icon.imagePath} alt={icon.label} fill className="object-cover" />
                    </button>
                  ))}
               </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-border/40">
            <Button 
              variant="outline" 
              onClick={handleShare}
              className="rounded-2xl h-14 flex-1 font-black uppercase text-[10px] tracking-widest gap-2 bg-muted/20 border-border/50"
            >
              <Share2 className="h-3.5 w-3.5 text-primary" /> Invite Friends
            </Button>
            
            {isSuperadmin && (
              <Link href="/admin" className="flex-1">
                <Button variant="outline" className="w-full rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest gap-2 bg-foreground text-background border-0 shadow-lg hover:opacity-90">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Admin Panel
                </Button>
              </Link>
            )}
          </div>

          <div className="space-y-4 pt-6 border-t border-border/40">
            <div className="flex items-center gap-2 px-1">
              <Lock className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Security Settings</span>
            </div>
            {!isChangingPassword ? (
              <Button 
                variant="outline" 
                onClick={() => setIsChangingPassword(true)}
                className="w-full rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest gap-2 border-border/50 bg-muted/20"
              >
                Change Arena Password
              </Button>
            ) : (
              <div className="space-y-4 p-6 rounded-[2rem] bg-muted/30 border border-primary/20 animate-in slide-in-from-top-4 duration-300">
                <Input 
                  type="password" 
                  placeholder="New Password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="rounded-xl h-12 text-sm font-bold bg-background"
                />
                <Input 
                  type="password" 
                  placeholder="Confirm New Password" 
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="rounded-xl h-12 text-sm font-bold bg-background"
                />
                <div className="flex gap-3 pt-2">
                  <Button 
                    className="flex-1 rounded-xl h-12 premium-gold-pill"
                    onClick={handlePasswordUpdate}
                    disabled={isUpdatingPassword}
                  >
                    {isUpdatingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Change"}
                  </Button>
                  <Button 
                    variant="ghost"
                    className="flex-1 rounded-xl h-12 text-[10px] uppercase font-black"
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

          <div className="pt-8">
            <Button variant="destructive" onClick={() => logout()} className="w-full rounded-2xl h-16 font-black uppercase tracking-[0.3em] text-xs gap-3 shadow-xl shadow-red-500/10 active:scale-95 transition-all">
              <LogOut className="h-4 w-4" /> Terminate Session
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
