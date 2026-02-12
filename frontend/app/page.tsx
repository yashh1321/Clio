import Link from "next/link";
import { WebGLShader } from "@/components/ui/web-gl-shader";
import { LiquidButton } from "@/components/ui/liquid-glass-button";

export default function DemoOne() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-black">
      <WebGLShader/> 
      <div className="relative z-10 w-full max-w-3xl px-4">
        <main className="relative border border-[#27272a] bg-black/50 backdrop-blur-sm py-20 px-4 overflow-hidden rounded-3xl">
          <h1 className="mb-3 text-white text-center text-7xl font-extrabold tracking-tighter md:text-[clamp(2rem,8vw,7rem)]">Clio</h1>
          <p className="text-white/60 px-6 text-center text-xs md:text-sm lg:text-lg mb-8">The modern standard for academic integrity. Verify authorship, protect your work, and write with confidence.</p>
          <div className="my-8 flex items-center justify-center gap-2">
            <span className="relative flex h-3 w-3 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
            </span>
            <p className="text-xs text-green-500 font-medium">Available for New Projects</p>
          </div>
                
          <div className="flex justify-center mt-8"> 
            <Link href="/login">
              <LiquidButton className="text-white border border-white/20 rounded-full" size={'xl'}>Let&apos;s Go</LiquidButton> 
            </Link>
          </div> 
        </main>
      </div>
    </div>
  )
}
