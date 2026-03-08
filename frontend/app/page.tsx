import Link from "next/link";

import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { WebGLShader } from "@/components/ui/web-gl-shader";

export default function DemoOne() {
  return (
    <div className="relative flex min-h-[125vh] w-full flex-col items-center justify-center overflow-hidden bg-black">
      {/* Background Animation */}
      <WebGLShader />

      <div className="relative z-10 w-full max-w-5xl px-4">
        <main className="relative border border-[#27272a] bg-black/50 backdrop-blur-sm py-28 px-6 overflow-hidden rounded-3xl">
          <h1 className="mb-4 text-white text-center text-8xl font-extrabold tracking-tighter md:text-[clamp(3rem,10vw,9rem)]">Clio</h1>
          <p className="text-white/60 px-8 text-center text-sm md:text-base lg:text-xl mb-10">The modern standard for academic integrity. Verify authorship, protect your work, and write with confidence.</p>
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
