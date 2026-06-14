"use client"

import { useEffect, useState } from "react"
import { Download, Share, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

function isIos() {
  if (typeof window === "undefined") return false

  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

function isStandalone() {
  if (typeof window === "undefined") return false

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari standalone check
    // @ts-expect-error iOS specific property
    window.navigator.standalone === true
  )
}

export function PwaInstallButton() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    setInstalled(isStandalone())

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setInstalled(true)
      setInstallEvent(null)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (installed) return

    if (installEvent) {
      await installEvent.prompt()
      const choice = await installEvent.userChoice

      if (choice.outcome === "accepted") {
        setInstalled(true)
      }

      setInstallEvent(null)
      return
    }

    setShowInstructions(true)
  }

  if (installed) return null

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleInstallClick}
        className="h-10 w-10 rounded-full border bg-white shadow-sm"
        aria-label="Install app"
      >
        <Download className="h-4 w-4 text-primary" />
      </Button>

      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-sm rounded-[2.5rem]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black italic uppercase text-gray-900">
              <Smartphone className="h-5 w-5 text-primary" />
              Install WC26 Predictor
            </DialogTitle>
            <DialogDescription className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">
              Add this app to your home screen for a full-screen app experience.
            </DialogDescription>
          </DialogHeader>

          {isIos() ? (
            <div className="space-y-4 text-sm p-4">
              <div className="rounded-2xl bg-primary/5 p-4 text-primary font-bold text-xs">
                iPhone/iPad requires manual installation from Safari.
              </div>

              <ol className="space-y-3 font-black uppercase text-[11px] text-gray-900 tracking-tight">
                <li className="flex items-center gap-3">
                  <span className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px]">1</span>
                  Open this site in Safari
                </li>
                <li className="flex items-center gap-3">
                  <span className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px]">2</span>
                  Tap the <Share className="h-4 w-4 text-primary" /> Share button
                </li>
                <li className="flex items-center gap-3">
                  <span className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px]">3</span>
                  Tap “Add to Home Screen”
                </li>
                <li className="flex items-center gap-3">
                  <span className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px]">4</span>
                  Tap “Add”
                </li>
              </ol>
            </div>
          ) : (
            <div className="space-y-3 text-xs p-4 text-gray-500 font-medium leading-relaxed">
              <p>
                Your browser did not show the install prompt automatically. Use your browser
                menu (usually three dots or a share icon) and choose <span className="font-black text-gray-900">“Install app”</span> or <span className="font-black text-gray-900">“Add to Home Screen”</span>.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}