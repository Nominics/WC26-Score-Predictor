
"use client"

import { useState, useEffect } from "react"
import { Bell, BellRing, Smartphone, Info, Share, Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
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

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationToggle() {
  const { toast } = useToast()
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [inPwa, setInPwa] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setInPwa(isStandalone())
    checkSubscription()
  }, [])

  const checkSubscription = async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return
    
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    setEnabled(!!subscription)
  }

  const handleToggle = async (checked: boolean) => {
    if (!inPwa) {
      setShowInstallPrompt(true)
      return
    }

    setLoading(true)
    try {
      if (checked) {
        if (!("Notification" in window)) {
          throw new Error("Notifications not supported in this browser.")
        }

        const permission = await Notification.requestPermission()
        if (permission !== "granted") {
          throw new Error("Permission denied. Enable notifications in settings.")
        }

        const registration = await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready

        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!publicKey) throw new Error("VAPID public key missing.")

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        })

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("User not authenticated.")

        const { error } = await supabase.from('push_subscriptions').upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          subscription: subscription.toJSON(),
          user_agent: navigator.userAgent,
          enabled: true
        }, { onConflict: 'endpoint' })

        if (error) throw error

        setEnabled(true)
        toast({ title: "Notifications Enabled!", description: "You will now receive live Arena & Chat alerts." })
      } else {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) {
          await subscription.unsubscribe()
          await supabase.from('push_subscriptions').update({ enabled: false }).eq('endpoint', subscription.endpoint)
        }
        setEnabled(false)
        toast({ title: "Notifications Disabled", description: "You will no longer receive Arena alerts." })
      }
    } catch (err: any) {
      setEnabled(false)
      toast({ variant: "destructive", title: "Setup Failed", description: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="p-5 bg-gray-50 border border-gray-100 rounded-3xl flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-white p-2 rounded-xl border border-gray-100">
            {loading ? (
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            ) : enabled ? (
              <BellRing className="h-4 w-4 text-primary animate-pulse" />
            ) : (
              <Bell className="h-4 w-4 text-gray-400" />
            )}
          </div>
          <div className="text-left">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">System Alerts</p>
            <span className="text-sm font-black text-gray-900">Push Notifications</span>
          </div>
        </div>
        <Switch 
          checked={enabled} 
          onCheckedChange={handleToggle}
          disabled={loading}
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
              Push Notifications require the Arena app to be installed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-2">
            <div className="rounded-2xl bg-primary/5 p-4 flex gap-3 items-start border border-primary/10">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium text-gray-600 leading-relaxed">
                To enable real-time goal alerts and chat messages on your {isIos() ? 'iPhone' : 'device'}, you must first add this app to your Home Screen.
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
