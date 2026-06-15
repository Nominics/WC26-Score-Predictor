"use client"

import { useState, useEffect } from "react"
import { Bell, BellRing, Smartphone, Info, Share } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

function isIos() {
  if (typeof window === "undefined") return false
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

function isStandalone() {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS specific property
    window.navigator.standalone === true
  )
}

export function NotificationToggle() {
  const { toast } = useToast()
  const [enabled, setEnabled] = useState(false)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [inPwa, setInPwa] = useState(false)

  useEffect(() => {
    setInPwa(isStandalone())
    
    // Check initial permission status
    if (typeof window !== "undefined" && "Notification" in window) {
      setEnabled(Notification.permission === "granted")
    }
  }, [])

  const handleToggle = async (checked: boolean) => {
    if (!inPwa) {
      setShowInstallPrompt(true)
      return
    }

    if (checked) {
      if (!("Notification" in window)) {
        toast({
          variant: "destructive",
          title: "Not Supported",
          description: "This browser does not support push notifications.",
        })
        return
      }

      const permission = await Notification.requestPermission()
      if (permission === "granted") {
        setEnabled(true)
        toast({
          title: "Notifications Enabled!",
          description: "You will now receive live match alerts in the Arena.",
        })
      } else {
        setEnabled(false)
        toast({
          variant: "destructive",
          title: "Permission Denied",
          description: "Please enable notifications in your device settings.",
        })
      }
    } else {
      setEnabled(false)
      toast({
        title: "Notifications Disabled",
        description: "You will no longer receive match updates.",
      })
    }
  }

  return (
    <>
      <div className="p-5 bg-gray-50 border border-gray-100 rounded-3xl flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-white p-2 rounded-xl border border-gray-100">
            {enabled ? (
              <BellRing className="h-4 w-4 text-primary animate-pulse" />
            ) : (
              <Bell className="h-4 w-4 text-gray-400" />
            )}
          </div>
          <div className="text-left">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Push Alerts</p>
            <span className="text-sm font-black text-gray-900">Live Match Updates</span>
          </div>
        </div>
        <Switch 
          checked={enabled} 
          onCheckedChange={handleToggle}
          className="data-[state=checked]:bg-primary"
        />
      </div>

      <Dialog open={showInstallPrompt} onOpenChange={setShowInstallPrompt}>
        <DialogContent className="max-w-sm rounded-[2.5rem]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black italic uppercase text-gray-900">
              <Smartphone className="h-5 w-5 text-primary" />
              Installation Required
            </DialogTitle>
            <DialogDescription className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">
              Live Push Notifications require the Arena app to be installed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-2">
            <div className="rounded-2xl bg-primary/5 p-4 flex gap-3 items-start border border-primary/10">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium text-gray-600 leading-relaxed">
                To enable real-time goal alerts and match locks on your {isIos() ? 'iPhone' : 'device'}, you must first add this app to your Home Screen.
              </p>
            </div>

            {isIos() ? (
              <div className="space-y-3 px-2">
                <ol className="space-y-2 font-black uppercase text-[10px] text-gray-900 tracking-tight">
                  <li className="flex items-center gap-3">
                    <span className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center">1</span>
                    Tap the <Share className="h-3 w-3 text-primary inline" /> Share icon in Safari
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center">2</span>
                    Select "Add to Home Screen"
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center">3</span>
                    Open the app from your Home Screen
                  </li>
                </ol>
              </div>
            ) : (
              <p className="text-[11px] text-center font-bold text-gray-500 uppercase">
                Open your browser menu and choose "Install App" to proceed.
              </p>
            )}
          </div>

          <DialogFooter className="sm:justify-center">
            <Button 
              onClick={() => setShowInstallPrompt(false)}
              className="w-full h-12 rounded-2xl bg-gray-900 text-white font-black uppercase text-xs tracking-widest"
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
