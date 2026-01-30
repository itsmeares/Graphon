const AmbientBackground = () => {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none select-none bg-transparent">
      {/* Atmosphere Gradients (Very low opacity to just tint the wallpaper) */}
      <div
        className="absolute inset-0 opacity-15"
        style={{
          background: `
            radial-gradient(circle at 20% 20%, rgba(56, 189, 248, 0.4) 0%, transparent 60%),
            radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.4) 0%, transparent 60%)
          `
        }}
      />

      {/* Noise Filter (Very subtle texture) */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`
        }}
      />
    </div>
  )
}

export default AmbientBackground
