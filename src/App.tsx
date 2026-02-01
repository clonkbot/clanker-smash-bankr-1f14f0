import { useState, useEffect, useCallback, useRef } from 'react'

interface TVState {
  id: number
  isVisible: boolean
  isSmashed: boolean
  showScore: boolean
}

interface Sparkle {
  id: number
  x: number
  y: number
}

function App() {
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('clanker-highscore')
    return saved ? parseInt(saved, 10) : 0
  })
  const [timeLeft, setTimeLeft] = useState(30)
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle')
  const [tvs, setTvs] = useState<TVState[]>(
    Array.from({ length: 9 }, (_, i) => ({ id: i, isVisible: false, isSmashed: false, showScore: false }))
  )
  const [sparkles, setSparkles] = useState<Sparkle[]>([])
  const [combo, setCombo] = useState(0)
  const [missedCount, setMissedCount] = useState(0)
  const sparkleIdRef = useRef(0)

  const startGame = useCallback(() => {
    setScore(0)
    setTimeLeft(30)
    setGameState('playing')
    setCombo(0)
    setMissedCount(0)
    setTvs(Array.from({ length: 9 }, (_, i) => ({ id: i, isVisible: false, isSmashed: false, showScore: false })))
  }, [])

  // Game timer
  useEffect(() => {
    if (gameState !== 'playing') return
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('ended')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameState])

  // Save high score
  useEffect(() => {
    if (gameState === 'ended' && score > highScore) {
      setHighScore(score)
      localStorage.setItem('clanker-highscore', score.toString())
    }
  }, [gameState, score, highScore])

  // TV spawning logic
  useEffect(() => {
    if (gameState !== 'playing') return

    const spawnTV = () => {
      setTvs(prev => {
        const hiddenTvs = prev.filter(tv => !tv.isVisible && !tv.isSmashed)
        if (hiddenTvs.length === 0) return prev

        const randomTv = hiddenTvs[Math.floor(Math.random() * hiddenTvs.length)]
        return prev.map(tv => 
          tv.id === randomTv.id ? { ...tv, isVisible: true, isSmashed: false, showScore: false } : tv
        )
      })
    }

    // Spawn TVs at random intervals (faster as time decreases)
    const baseInterval = Math.max(400, 1200 - (30 - timeLeft) * 30)
    const interval = setInterval(spawnTV, baseInterval + Math.random() * 400)

    return () => clearInterval(interval)
  }, [gameState, timeLeft])

  // Auto-hide TVs after delay (counts as miss)
  useEffect(() => {
    if (gameState !== 'playing') return

    const checkTvs = setInterval(() => {
      setTvs(prev => {
        const newTvs = prev.map(tv => {
          if (tv.isVisible && !tv.isSmashed) {
            // Random chance to hide
            if (Math.random() < 0.15) {
              setCombo(0)
              setMissedCount(c => c + 1)
              return { ...tv, isVisible: false }
            }
          }
          return tv
        })
        return newTvs
      })
    }, 500)

    return () => clearInterval(checkTvs)
  }, [gameState])

  const smashTV = useCallback((id: number, e: React.MouseEvent) => {
    if (gameState !== 'playing') return

    setTvs(prev => {
      const tv = prev.find(t => t.id === id)
      if (!tv || !tv.isVisible || tv.isSmashed) return prev
      
      return prev.map(t => 
        t.id === id ? { ...t, isSmashed: true, showScore: true } : t
      )
    })

    // Calculate score with combo
    const newCombo = combo + 1
    setCombo(newCombo)
    const points = 100 * Math.min(newCombo, 5)
    setScore(prev => prev + points)

    // Add sparkle effect
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const sparkleId = sparkleIdRef.current++
    setSparkles(prev => [...prev, { id: sparkleId, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }])
    
    // Remove sparkle after animation
    setTimeout(() => {
      setSparkles(prev => prev.filter(s => s.id !== sparkleId))
    }, 500)

    // Hide TV after smash animation
    setTimeout(() => {
      setTvs(prev => prev.map(t => 
        t.id === id ? { ...t, isVisible: false, isSmashed: false, showScore: false } : t
      ))
    }, 300)
  }, [gameState, combo])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-950 to-gray-900 flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Ambient arcade lights */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      {/* Sparkle effects */}
      {sparkles.map(sparkle => (
        <div
          key={sparkle.id}
          className="fixed pointer-events-none z-50"
          style={{ left: sparkle.x, top: sparkle.y }}
        >
          <div className="relative">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 bg-yellow-400"
                style={{
                  animation: 'sparkle 0.5s ease-out forwards',
                  transform: `rotate(${i * 45}deg) translateY(-20px)`,
                  boxShadow: '0 0 10px #fbbf24, 0 0 20px #fbbf24'
                }}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Main Arcade Cabinet */}
      <div className="relative w-full max-w-2xl">
        {/* Cabinet Top - Marquee */}
        <div className="relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-t-3xl p-4 border-4 border-gray-700 shadow-2xl">
          <div className="absolute inset-2 bg-black rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-pink-600 to-amber-500 opacity-90" />
            <div className="relative z-10 text-center py-3">
              <h1 
                className="font-['Press_Start_2P'] text-2xl sm:text-4xl text-cyan-300 neon-text tracking-wider"
                style={{ textShadow: '0 0 10px #22d3ee, 0 0 20px #22d3ee, 0 0 40px #22d3ee, 0 0 80px #22d3ee' }}
              >
                CLANKER
              </h1>
              <p 
                className="font-['Press_Start_2P'] text-sm sm:text-lg text-pink-400 mt-1"
                style={{ textShadow: '0 0 10px #f472b6, 0 0 20px #f472b6' }}
              >
                SMASH BANKR
              </p>
            </div>
          </div>
          
          {/* Decorative bolts */}
          {['-left-1 top-2', '-right-1 top-2', '-left-1 bottom-2', '-right-1 bottom-2'].map((pos, i) => (
            <div key={i} className={`absolute ${pos} w-4 h-4 bg-gray-600 rounded-full border-2 border-gray-500`}>
              <div className="absolute inset-1 bg-gray-700 rounded-full" />
            </div>
          ))}
        </div>

        {/* Score Display */}
        <div className="bg-gray-900 border-x-4 border-gray-700 px-4 py-3">
          <div className="flex justify-between items-center bg-black/80 rounded-lg p-3 border-2 border-gray-800">
            <div className="text-center">
              <p className="font-['Press_Start_2P'] text-[10px] text-gray-500">HIGH</p>
              <p className="font-['VT323'] text-2xl text-amber-400" style={{ textShadow: '0 0 10px #fbbf24' }}>
                {highScore.toString().padStart(6, '0')}
              </p>
            </div>
            <div className="text-center">
              <p className="font-['Press_Start_2P'] text-[10px] text-gray-500">SCORE</p>
              <p className="font-['VT323'] text-3xl text-green-400" style={{ textShadow: '0 0 10px #4ade80' }}>
                {score.toString().padStart(6, '0')}
              </p>
            </div>
            <div className="text-center">
              <p className="font-['Press_Start_2P'] text-[10px] text-gray-500">TIME</p>
              <p 
                className={`font-['VT323'] text-2xl ${timeLeft <= 10 ? 'text-red-500' : 'text-cyan-400'}`}
                style={{ textShadow: timeLeft <= 10 ? '0 0 10px #ef4444' : '0 0 10px #22d3ee' }}
              >
                {timeLeft}
              </p>
            </div>
            <div className="text-center">
              <p className="font-['Press_Start_2P'] text-[10px] text-gray-500">COMBO</p>
              <p className="font-['VT323'] text-2xl text-pink-400" style={{ textShadow: '0 0 10px #f472b6' }}>
                x{Math.min(combo, 5)}
              </p>
            </div>
          </div>
        </div>

        {/* Main Game Screen */}
        <div className="wood-grain border-x-8 border-b-8 border-t-0 border-amber-900/80 rounded-b-xl p-6 cabinet-glow">
          {/* CRT Screen Bezel */}
          <div className="bg-gray-900 rounded-2xl p-4 border-8 border-gray-800 shadow-inner">
            {/* CRT Screen */}
            <div className="relative bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-xl overflow-hidden crt-effect scanlines">
              {/* Screen Content */}
              <div className="relative z-10 p-4 sm:p-6">
                {gameState === 'idle' && (
                  <div className="flex flex-col items-center justify-center h-80 space-y-6">
                    <div className="text-center">
                      <p className="font-['Press_Start_2P'] text-cyan-400 text-xs sm:text-sm mb-4 neon-text">
                        SMASH THE BANKR TVs!
                      </p>
                      <div className="relative inline-block">
                        <TVCharacter isDemo />
                      </div>
                    </div>
                    <button
                      onClick={startGame}
                      className="font-['Press_Start_2P'] text-lg px-8 py-4 bg-gradient-to-b from-green-400 to-green-600 text-black rounded-lg border-b-4 border-green-800 hover:from-green-300 hover:to-green-500 active:border-b-0 active:translate-y-1 transition-all shadow-lg hover:shadow-green-500/50"
                    >
                      INSERT COIN
                    </button>
                    <p className="font-['VT323'] text-gray-500 text-lg">
                      Click the TVs before they escape!
                    </p>
                  </div>
                )}

                {gameState === 'playing' && (
                  <div className="grid grid-cols-3 gap-3 sm:gap-4">
                    {tvs.map((tv) => (
                      <GameHole
                        key={tv.id}
                        tv={tv}
                        onSmash={smashTV}
                      />
                    ))}
                  </div>
                )}

                {gameState === 'ended' && (
                  <div className="flex flex-col items-center justify-center h-80 space-y-6">
                    <div className="text-center">
                      <p className="font-['Press_Start_2P'] text-red-500 text-xl mb-2 neon-text">
                        GAME OVER
                      </p>
                      <p className="font-['VT323'] text-4xl text-green-400 mb-2" style={{ textShadow: '0 0 20px #4ade80' }}>
                        {score.toString().padStart(6, '0')}
                      </p>
                      {score > highScore - score && score > 0 && (
                        <p className="font-['Press_Start_2P'] text-xs text-amber-400 animate-pulse">
                          ★ NEW HIGH SCORE ★
                        </p>
                      )}
                      <div className="mt-4 font-['VT323'] text-gray-400 text-lg">
                        <p>TVs Smashed: {Math.floor(score / 100)}</p>
                        <p>TVs Escaped: {missedCount}</p>
                      </div>
                    </div>
                    <button
                      onClick={startGame}
                      className="font-['Press_Start_2P'] text-sm px-6 py-3 bg-gradient-to-b from-cyan-400 to-cyan-600 text-black rounded-lg border-b-4 border-cyan-800 hover:from-cyan-300 hover:to-cyan-500 active:border-b-0 active:translate-y-1 transition-all shadow-lg hover:shadow-cyan-500/50"
                    >
                      PLAY AGAIN
                    </button>
                  </div>
                )}
              </div>

              {/* CRT curve effect overlay */}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/5 via-transparent to-black/20 rounded-xl" />
            </div>
          </div>

          {/* Speaker Grille */}
          <div className="mt-4 flex justify-center gap-4">
            <div className="w-24 h-16 bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-800">
              <div className="w-full h-full flex flex-col justify-evenly">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-1 bg-gray-700 mx-2 rounded" />
                ))}
              </div>
            </div>
            <div className="w-24 h-16 bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-800">
              <div className="w-full h-full flex flex-col justify-evenly">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-1 bg-gray-700 mx-2 rounded" />
                ))}
              </div>
            </div>
          </div>

          {/* Decorative stickers */}
          <div className="mt-3 flex justify-center gap-2">
            <div className="px-2 py-1 bg-red-600 rounded text-[8px] font-bold text-white transform -rotate-3">
              ARCADE
            </div>
            <div className="px-2 py-1 bg-yellow-500 rounded text-[8px] font-bold text-black transform rotate-2">
              1 PLAYER
            </div>
            <div className="px-2 py-1 bg-blue-600 rounded text-[8px] font-bold text-white transform -rotate-1">
              HI-SCORE
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center">
        <p className="font-['VT323'] text-gray-600 text-sm tracking-wide">
          Requested by @nobody180bc · Built by @clonkbot
        </p>
      </footer>
    </div>
  )
}

interface GameHoleProps {
  tv: TVState
  onSmash: (id: number, e: React.MouseEvent) => void
}

function GameHole({ tv, onSmash }: GameHoleProps) {
  return (
    <div 
      className="relative aspect-square game-hole"
      onClick={(e) => tv.isVisible && !tv.isSmashed && onSmash(tv.id, e)}
    >
      {/* Hole base */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-950 to-amber-900 rounded-2xl" />
      
      {/* Hole opening */}
      <div className="absolute inset-2 bg-black rounded-xl hole-shadow overflow-hidden">
        {/* Hole depth effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900 to-gray-800 opacity-50" />
        
        {/* TV Character */}
        {tv.isVisible && (
          <div 
            className={`absolute inset-0 flex items-center justify-center ${tv.isSmashed ? 'tv-smash' : 'tv-pop'}`}
          >
            <TVCharacter />
            {tv.showScore && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 score-float">
                <span className="font-['Press_Start_2P'] text-xs text-yellow-400" style={{ textShadow: '0 0 10px #fbbf24' }}>
                  +100
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Hole rim highlight */}
      <div className="absolute inset-2 rounded-xl border-t-2 border-amber-700/50 pointer-events-none" />
    </div>
  )
}

function TVCharacter({ isDemo = false }: { isDemo?: boolean }) {
  return (
    <div className={`relative ${isDemo ? 'scale-150' : ''}`}>
      {/* Antennas */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex gap-3">
        <div className="antenna-wobble" style={{ animationDelay: '0s' }}>
          <div className="w-1 h-6 bg-gray-400 rounded-full transform -rotate-12 origin-bottom">
            <div className="absolute -top-1 -left-1 w-3 h-3 bg-gray-500 rounded-full" />
          </div>
        </div>
        <div className="antenna-wobble" style={{ animationDelay: '0.15s' }}>
          <div className="w-1 h-6 bg-gray-400 rounded-full transform rotate-12 origin-bottom">
            <div className="absolute -top-1 -left-1 w-3 h-3 bg-gray-500 rounded-full" />
          </div>
        </div>
      </div>
      
      {/* TV Body */}
      <div className="relative w-12 h-10 sm:w-14 sm:h-12 bg-gradient-to-b from-gray-600 to-gray-700 rounded-lg border-2 border-gray-500 shadow-lg">
        {/* Screen */}
        <div className="absolute inset-1 bg-gradient-to-br from-cyan-900 via-blue-900 to-purple-900 rounded overflow-hidden">
          {/* Static effect */}
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
          {/* BANKR text on screen */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-['Press_Start_2P'] text-[6px] text-red-500 opacity-80">BANKR</span>
          </div>
          {/* Screen glare */}
          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t" />
        </div>
        
        {/* Control knobs */}
        <div className="absolute -right-0.5 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
          <div className="w-1.5 h-1.5 bg-gray-500 rounded-full border border-gray-400" />
          <div className="w-1.5 h-1.5 bg-gray-500 rounded-full border border-gray-400" />
        </div>
      </div>
      
      {/* TV Legs */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-4">
        <div className="w-1 h-2 bg-gray-600 rounded-b" />
        <div className="w-1 h-2 bg-gray-600 rounded-b" />
      </div>
    </div>
  )
}

export default App