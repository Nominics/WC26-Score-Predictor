"use client"

import Image from "next/image"

export function AppLoadingScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--app-bg)] transition-colors duration-500">
      {/* Premium Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative flex flex-col items-center gap-10 animate-in fade-in zoom-in-95 duration-700 overflow-visible">
        {/* Logo with Glow */}
        <div className="relative h-32 w-32 drop-shadow-[0_0_25px_rgba(234,179,8,0.4)]">
          <Image 
            src="/logo.png" 
            alt="WC26 Arena Logo" 
            fill 
            priority
            className="object-contain animate-pulse"
          />
        </div>
        
        {/* WC26 Branding */}
        <div className="flex flex-col items-center gap-4 overflow-visible">
          <h1 className="text-5xl leading-tight uppercase overflow-visible">
            <span className="text-foreground font-black italic tracking-tight">ARENA</span> <span className="premium-gold-gradient-heading">WC26</span>
          </h1>
          
          <div className="flex flex-col items-center gap-3">
             <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" />
             </div>
             <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.5em] animate-pulse">
               Synchronizing Feed
             </p>
          </div>
        </div>
      </div>
      
      {/* Footer Branding */}
      <div className="absolute bottom-12 text-center opacity-30">
         <p className="text-[8px] font-black uppercase tracking-[0.4em] text-muted-foreground">Powered by Eos</p>
      </div>
    </div>
  )
}