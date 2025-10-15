"use client"

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-500/60 rounded-full blur-xl animate-pulse"></div>
        <div
          className="absolute top-40 right-20 w-24 h-24 bg-purple-500/60 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div
          className="absolute bottom-32 left-1/4 w-40 h-40 bg-pink-500/60 rounded-full blur-xl animate-pulse delay-2000"></div>
        <div
          className="absolute bottom-20 right-1/3 w-28 h-28 bg-cyan-500/60 rounded-full blur-xl animate-pulse delay-3000"></div>
      </div>

      <div className="relative z-10 max-w-md w-full">
        <div className="bg-white/10 rounded-3xl p-8 border border-white/20 shadow-2xl text-center">
          <div
            className="flex flex-col items-center justify-center text-center">
            <div
              aria-hidden="true"
              className="h-16 w-16 rounded-full border-4 border-foreground/20 border-t-primary animate-spin"
            />
            <p className="mt-4 text-lg font-medium text-foreground/80">Loading...</p>
          </div>
          <span className="sr-only">Loading profile…</span>
        </div>
      </div>
    </div>
  )
}
