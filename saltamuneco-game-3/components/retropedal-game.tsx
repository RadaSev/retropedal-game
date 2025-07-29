"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Share2, Github, RotateCcw } from "lucide-react"

interface GameState {
  scrollSpeed: number
  maxScrollSpeed: number
  deceleration: number
  clickCounter: number
  pedalAnimation: {
    active: boolean
    currentFrame: number
    frameTimer: number
    frameRate: number
  }
  roadOffset: number
  isClicking: boolean
  lastClickTime: number
  highScore: number
  gameTime: number
}

const GAME_CONFIG = {
  width: 800,
  height: 600,
  maxScrollSpeed: 5,
  deceleration: 0.1,
  speedIncrease: 0.5,
  pedalFrameRate: 10,
  idleTimeout: 200,
}

export default function RetroPedalGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameLoopRef = useRef<number>()
  const lastTimeRef = useRef<number>(0)

  const [gameState, setGameState] = useState<GameState>({
    scrollSpeed: 0,
    maxScrollSpeed: GAME_CONFIG.maxScrollSpeed,
    deceleration: GAME_CONFIG.deceleration,
    clickCounter: 0,
    pedalAnimation: {
      active: false,
      currentFrame: 0,
      frameTimer: 0,
      frameRate: GAME_CONFIG.pedalFrameRate,
    },
    roadOffset: 0,
    isClicking: false,
    lastClickTime: 0,
    highScore: 0,
    gameTime: 0,
  })

  const [isMobile, setIsMobile] = useState(false)
  const [mountainImage, setMountainImage] = useState<HTMLImageElement | null>(null)

  // Detectar dispositivo móvil y cargar datos
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const mobileKeywords = ["mobile", "android", "iphone", "ipad", "tablet"]
      return mobileKeywords.some((keyword) => userAgent.includes(keyword)) || window.innerWidth < 768
    }

    setIsMobile(checkMobile())

    // Cargar high score del localStorage
    try {
      const savedHighScore = localStorage.getItem("retropedal-highscore")
      if (savedHighScore) {
        setGameState((prev) => ({ ...prev, highScore: Number.parseInt(savedHighScore) || 0 }))
      }
    } catch (error) {
      console.log("LocalStorage no disponible")
    }

    // Configurar viewport para móviles
    if (checkMobile()) {
      const viewport = document.querySelector('meta[name="viewport"]')
      if (viewport) {
        viewport.setAttribute("content", "width=device-width, initial-scale=1.0, user-scalable=no, maximum-scale=1.0")
      }
    }
  }, [])

  // Cargar imagen de montañas
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => setMountainImage(img)
    // Usar placeholder que funcione en GitHub Pages
    img.src =
      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDgwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0wIDMwMEw1MCAyNTBMMTAwIDIwMEwxNTAgMTUwTDIwMCAxMDBMMjUwIDUwTDMwMCAxMDBMMzUwIDE1MEw0MDAgMjAwTDQ1MCAyNTBMNTAwIDIwMEw1NTAgMTUwTDYwMCAxMDBMNjUwIDUwTDcwMCAxMDBMNzUwIDE1MEw4MDAgMjAwVjMwMEgwWiIgZmlsbD0iIzY2NjY2NiIvPgo8L3N2Zz4K"
  }, [])

  // Guardar high score
  useEffect(() => {
    if (gameState.clickCounter > gameState.highScore) {
      const newHighScore = gameState.clickCounter
      setGameState((prev) => ({ ...prev, highScore: newHighScore }))
      try {
        localStorage.setItem("retropedal-highscore", newHighScore.toString())
      } catch (error) {
        console.log("No se pudo guardar el high score")
      }
    }
  }, [gameState.clickCounter, gameState.highScore])

  // Dibujar carretera en perspectiva
  const drawRoad = (ctx: CanvasRenderingContext2D, offset: number, speed: number) => {
    // Cielo con gradiente dinámico
    const skyIntensity = Math.min(speed / GAME_CONFIG.maxScrollSpeed, 1)
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_CONFIG.height / 2)
    gradient.addColorStop(0, `hsl(200, 70%, ${70 + skyIntensity * 10}%)`)
    gradient.addColorStop(1, `hsl(200, 50%, ${85 + skyIntensity * 5}%)`)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height / 2)

    // Montañas con parallax
    if (mountainImage) {
      const mountainWidth = mountainImage.width
      const mountainHeight = mountainImage.height
      const scaleFactor = GAME_CONFIG.height / 2 / mountainHeight
      const scaledWidth = mountainWidth * scaleFactor
      const scaledHeight = mountainHeight * scaleFactor

      const mountainOffset = (offset * 0.03) % scaledWidth

      for (let i = -1; i <= Math.ceil(GAME_CONFIG.width / scaledWidth) + 1; i++) {
        const x = i * scaledWidth - mountainOffset
        const y = GAME_CONFIG.height / 2 - scaledHeight
        ctx.drawImage(mountainImage, x, y, scaledWidth, scaledHeight)
      }
    } else {
      // Fallback: montañas simples
      ctx.fillStyle = "#666666"
      ctx.beginPath()
      for (let i = 0; i < GAME_CONFIG.width + 100; i += 50) {
        const x = i + ((offset * 0.03) % 100)
        const height = 80 + Math.sin(i * 0.01) * 30
        ctx.lineTo(x, GAME_CONFIG.height / 2 - height)
      }
      ctx.lineTo(GAME_CONFIG.width, GAME_CONFIG.height / 2)
      ctx.lineTo(0, GAME_CONFIG.height / 2)
      ctx.closePath()
      ctx.fill()
    }

    // Carretera
    const vanishingPointY = GAME_CONFIG.height / 2

    // Asfalto
    ctx.fillStyle = "#404040"
    ctx.beginPath()
    ctx.moveTo(GAME_CONFIG.width / 2 - 2, vanishingPointY)
    ctx.lineTo(GAME_CONFIG.width / 2 + 2, vanishingPointY)
    ctx.lineTo(GAME_CONFIG.width, GAME_CONFIG.height)
    ctx.lineTo(0, GAME_CONFIG.height)
    ctx.closePath()
    ctx.fill()

    // Líneas de la carretera
    ctx.strokeStyle = speed > 3 ? "#FFFF88" : "#FFFF00"
    ctx.lineWidth = 4

    const segmentLength = 40
    const gapLength = 30
    const totalSegment = segmentLength + gapLength

    for (let i = 0; i < 20; i++) {
      const progress = i / 20
      const y = vanishingPointY + (GAME_CONFIG.height - vanishingPointY) * progress
      const width = 4 * progress

      const segmentOffset = (offset * speed * 2) % totalSegment
      const segmentStart = i * totalSegment - segmentOffset

      if (segmentStart % totalSegment < segmentLength) {
        ctx.lineWidth = width
        ctx.beginPath()
        ctx.moveTo(GAME_CONFIG.width / 2 - width / 2, y)
        ctx.lineTo(GAME_CONFIG.width / 2 + width / 2, y)
        ctx.stroke()
      }
    }

    // Bordes y césped
    ctx.strokeStyle = "#FFFFFF"
    ctx.lineWidth = 2

    ctx.beginPath()
    ctx.moveTo(GAME_CONFIG.width / 2 - 1, vanishingPointY)
    ctx.lineTo(50, GAME_CONFIG.height)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(GAME_CONFIG.width / 2 + 1, vanishingPointY)
    ctx.lineTo(GAME_CONFIG.width - 50, GAME_CONFIG.height)
    ctx.stroke()

    const grassColor = speed > 2 ? "#228B22" : "#32CD32"
    ctx.fillStyle = grassColor

    ctx.beginPath()
    ctx.moveTo(0, vanishingPointY)
    ctx.lineTo(GAME_CONFIG.width / 2 - 1, vanishingPointY)
    ctx.lineTo(50, GAME_CONFIG.height)
    ctx.lineTo(0, GAME_CONFIG.height)
    ctx.closePath()
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(GAME_CONFIG.width, vanishingPointY)
    ctx.lineTo(GAME_CONFIG.width / 2 + 1, vanishingPointY)
    ctx.lineTo(GAME_CONFIG.width - 50, GAME_CONFIG.height)
    ctx.lineTo(GAME_CONFIG.width, GAME_CONFIG.height)
    ctx.closePath()
    ctx.fill()
  }

  // Dibujar volante
  const drawSteeringWheel = (ctx: CanvasRenderingContext2D) => {
    const centerX = 400
    const centerY = 500
    const scale = isMobile ? 0.9 : 1.1

    // Sombra
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)"
    ctx.beginPath()
    ctx.arc(centerX + 4, centerY + 4, 65 * scale, 0, Math.PI * 2)
    ctx.fill()

    // Volante exterior
    ctx.strokeStyle = "#2C1810"
    ctx.lineWidth = 10 * scale
    ctx.beginPath()
    ctx.arc(centerX, centerY, 65 * scale, 0, Math.PI * 2)
    ctx.stroke()

    // Volante interior
    ctx.strokeStyle = "#8B4513"
    ctx.lineWidth = 6 * scale
    ctx.beginPath()
    ctx.arc(centerX, centerY, 65 * scale, 0, Math.PI * 2)
    ctx.stroke()

    // Radios
    ctx.strokeStyle = "#2C1810"
    ctx.lineWidth = 3 * scale
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2
      const startX = centerX + Math.cos(angle) * 20 * scale
      const startY = centerY + Math.sin(angle) * 20 * scale
      const endX = centerX + Math.cos(angle) * 60 * scale
      const endY = centerY + Math.sin(angle) * 60 * scale

      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.lineTo(endX, endY)
      ctx.stroke()
    }

    // Centro
    ctx.fillStyle = "#2C1810"
    ctx.beginPath()
    ctx.arc(centerX, centerY, 20 * scale, 0, Math.PI * 2)
    ctx.fill()

    // Logo
    ctx.fillStyle = "#FFD700"
    ctx.font = `bold ${12 * scale}px Arial`
    ctx.textAlign = "center"
    ctx.fillText("RP", centerX, centerY + 4)
  }

  // Dibujar pedales
  const drawPedals = (ctx: CanvasRenderingContext2D, animationState: GameState["pedalAnimation"]) => {
    const pedalX = 350
    const pedalY = 550
    const pedalWidth = isMobile ? 70 : 90
    const pedalHeight = isMobile ? 20 : 25

    let pedalOffset = 0
    if (animationState.active) {
      pedalOffset = animationState.currentFrame === 0 ? -5 : 5
    }

    // Sombras
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
    ctx.fillRect(pedalX - 8, pedalY + pedalOffset + 2, pedalWidth / 2 - 5, pedalHeight)
    ctx.fillRect(pedalX + pedalWidth / 2 + 7, pedalY - pedalOffset + 2, pedalWidth / 2 - 5, pedalHeight)

    // Pedales
    ctx.fillStyle = "#2C1810"
    ctx.fillRect(pedalX - 10, pedalY + pedalOffset, pedalWidth / 2 - 5, pedalHeight)
    ctx.fillRect(pedalX + pedalWidth / 2 + 5, pedalY - pedalOffset, pedalWidth / 2 - 5, pedalHeight)

    // Detalles
    ctx.fillStyle = "#666"
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(pedalX - 5 + i * 6, pedalY + pedalOffset + 3, 2, 15)
      ctx.fillRect(pedalX + pedalWidth / 2 + 10 + i * 6, pedalY - pedalOffset + 3, 2, 15)
    }
  }

  // Dibujar UI
  const drawUI = (
    ctx: CanvasRenderingContext2D,
    clickCounter: number,
    speed: number,
    highScore: number,
    gameTime: number,
  ) => {
    const fontSize = isMobile ? 18 : 22
    const smallFontSize = isMobile ? 12 : 16

    // Fondo para UI
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)"
    ctx.fillRect(0, 0, GAME_CONFIG.width, 70)

    // Contador de pedaleos
    ctx.fillStyle = "#FFFFFF"
    ctx.strokeStyle = "#000000"
    ctx.lineWidth = 2
    ctx.font = `bold ${fontSize}px monospace`
    ctx.textAlign = "right"

    const text = `Pedaleos: ${clickCounter}`
    const textX = GAME_CONFIG.width - 15
    ctx.strokeText(text, textX, 25)
    ctx.fillText(text, textX, 25)

    // High Score
    if (highScore > 0) {
      ctx.font = `${smallFontSize}px monospace`
      const highScoreText = `Récord: ${highScore}`
      ctx.strokeText(highScoreText, textX, 45)
      ctx.fillText(highScoreText, textX, 45)
    }

    // Velocímetro
    ctx.font = `bold ${fontSize}px monospace`
    ctx.textAlign = "left"
    const speedText = `${Math.round(speed * 20)} km/h`
    ctx.strokeText(speedText, 15, 25)
    ctx.fillText(speedText, 15, 25)

    // Tiempo
    ctx.font = `${smallFontSize}px monospace`
    const timeText = `Tiempo: ${Math.floor(gameTime)}s`
    ctx.strokeText(timeText, 15, 45)
    ctx.fillText(timeText, 15, 45)

    // Barra de velocidad
    const barWidth = isMobile ? 120 : 160
    const barHeight = isMobile ? 8 : 12
    const barX = 15
    const barY = isMobile ? 55 : 60

    ctx.fillStyle = "#333"
    ctx.fillRect(barX, barY, barWidth, barHeight)

    const speedPercent = speed / GAME_CONFIG.maxScrollSpeed
    const speedBarWidth = barWidth * speedPercent

    const speedGradient = ctx.createLinearGradient(barX, barY, barX + speedBarWidth, barY)
    speedGradient.addColorStop(0, "#00FF00")
    speedGradient.addColorStop(0.5, "#FFFF00")
    speedGradient.addColorStop(1, "#FF0000")

    ctx.fillStyle = speedGradient
    ctx.fillRect(barX, barY, speedBarWidth, barHeight)

    ctx.strokeStyle = "#FFF"
    ctx.lineWidth = 1
    ctx.strokeRect(barX, barY, barWidth, barHeight)

    // Nuevo récord
    if (clickCounter > highScore && clickCounter > 0) {
      ctx.fillStyle = "#FFD700"
      ctx.font = `bold ${smallFontSize}px Arial`
      ctx.textAlign = "center"
      const flashEffect = Math.sin(Date.now() * 0.01) > 0 ? 1 : 0.5
      ctx.globalAlpha = flashEffect
      ctx.fillText("¡NUEVO RÉCORD!", GAME_CONFIG.width / 2, GAME_CONFIG.height - 20)
      ctx.globalAlpha = 1
    }
  }

  // Manejar click/touch
  const handleClick = useCallback(() => {
    setGameState((prevState) => ({
      ...prevState,
      clickCounter: prevState.clickCounter + 1,
      scrollSpeed: Math.min(prevState.scrollSpeed + GAME_CONFIG.speedIncrease, GAME_CONFIG.maxScrollSpeed),
      pedalAnimation: {
        ...prevState.pedalAnimation,
        active: true,
      },
      isClicking: true,
      lastClickTime: Date.now(),
    }))
  }, [])

  // Actualizar juego
  const updateGame = useCallback((deltaTime: number) => {
    setGameState((prevState) => {
      const newState = { ...prevState }
      const currentTime = Date.now()

      // Actualizar tiempo de juego
      newState.gameTime += deltaTime

      const isIdle = currentTime - newState.lastClickTime > GAME_CONFIG.idleTimeout

      if (isIdle) {
        newState.isClicking = false
        newState.pedalAnimation.active = false
      }

      if (!newState.isClicking && newState.scrollSpeed > 0) {
        newState.scrollSpeed = Math.max(0, newState.scrollSpeed - GAME_CONFIG.deceleration * deltaTime * 60)
      }

      newState.roadOffset += newState.scrollSpeed * deltaTime * 60

      if (newState.pedalAnimation.active) {
        newState.pedalAnimation.frameTimer += deltaTime
        if (newState.pedalAnimation.frameTimer >= 1 / newState.pedalAnimation.frameRate) {
          newState.pedalAnimation.currentFrame = (newState.pedalAnimation.currentFrame + 1) % 2
          newState.pedalAnimation.frameTimer = 0
        }
      }

      return newState
    })
  }, [])

  // Renderizar juego
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height)

    drawRoad(ctx, gameState.roadOffset, gameState.scrollSpeed)
    drawPedals(ctx, gameState.pedalAnimation)
    drawSteeringWheel(ctx)
    drawUI(ctx, gameState.clickCounter, gameState.scrollSpeed, gameState.highScore, gameState.gameTime)

    // Efectos de velocidad
    if (gameState.scrollSpeed > 2) {
      const intensity = gameState.scrollSpeed / GAME_CONFIG.maxScrollSpeed
      ctx.strokeStyle = `rgba(255, 255, 255, ${intensity * 0.3})`
      ctx.lineWidth = 1

      const lineCount = Math.floor(intensity * 6)
      for (let i = 0; i < lineCount; i++) {
        const x = Math.random() * GAME_CONFIG.width
        const y = Math.random() * GAME_CONFIG.height
        const length = gameState.scrollSpeed * 10

        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x, y + length)
        ctx.stroke()
      }
    }
  }, [gameState])

  // Loop principal del juego
  const gameLoop = useCallback(
    (currentTime: number) => {
      const deltaTime = (currentTime - lastTimeRef.current) / 1000
      lastTimeRef.current = currentTime

      updateGame(deltaTime)
      render()

      gameLoopRef.current = requestAnimationFrame(gameLoop)
    },
    [updateGame, render],
  )

  // Manejar eventos
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleInteraction = (e: Event) => {
      e.preventDefault()
      handleClick()
    }

    canvas.addEventListener("click", handleInteraction)
    canvas.addEventListener("touchstart", handleInteraction)
    canvas.addEventListener("touchend", (e) => e.preventDefault())

    return () => {
      canvas.removeEventListener("click", handleInteraction)
      canvas.removeEventListener("touchstart", handleInteraction)
      canvas.removeEventListener("touchend", (e) => e.preventDefault())
    }
  }, [handleClick])

  // Iniciar loop del juego
  useEffect(() => {
    lastTimeRef.current = performance.now()
    gameLoopRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [gameLoop])

  // Funciones para compartir y resetear
  const shareGame = async () => {
    const url = window.location.href
    const text = `¡Conseguí ${gameState.clickCounter} pedaleos en RetroPedal! 🚴‍♂️ ¿Puedes superarme?`

    if (navigator.share && isMobile) {
      try {
        await navigator.share({
          title: "RetroPedal - Juego de Ciclismo",
          text: text,
          url: url,
        })
      } catch (error) {
        copyToClipboard(`${text} ${url}`)
      }
    } else {
      copyToClipboard(`${text} ${url}`)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert("¡Enlace copiado al portapapeles!")
    } catch (error) {
      const textArea = document.createElement("textarea")
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      alert("¡Enlace copiado!")
    }
  }

  const resetGame = () => {
    setGameState((prev) => ({
      ...prev,
      clickCounter: 0,
      scrollSpeed: 0,
      roadOffset: 0,
      isClicking: false,
      gameTime: 0,
      pedalAnimation: {
        ...prev.pedalAnimation,
        active: false,
        currentFrame: 0,
      },
    }))
  }

  // Calcular tamaño del canvas
  const canvasStyle = isMobile
    ? {
        width: "100%",
        height: "auto",
        maxWidth: "100vw",
        maxHeight: "60vh",
        imageRendering: "pixelated" as const,
      }
    : {
        imageRendering: "pixelated" as const,
      }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-2">
      <div className="mb-4 text-center">
        <h1 className={`font-bold text-white mb-2 ${isMobile ? "text-3xl" : "text-5xl"}`}>🚴 RetroPedal</h1>
        <p className={`text-gray-300 mb-2 ${isMobile ? "text-sm" : "text-base"}`}>
          {isMobile ? "¡Toca la pantalla para pedalear!" : "¡Haz click para pedalear!"}
        </p>
        {gameState.highScore > 0 && (
          <p className="text-yellow-400 text-sm">🏆 Récord: {gameState.highScore} pedaleos</p>
        )}
      </div>

      <div className={`border-4 border-gray-600 rounded-lg overflow-hidden shadow-2xl ${isMobile ? "w-full" : ""}`}>
        <canvas
          ref={canvasRef}
          width={GAME_CONFIG.width}
          height={GAME_CONFIG.height}
          className="block cursor-pointer"
          style={canvasStyle}
        />
      </div>

      <div className={`mt-4 grid grid-cols-3 gap-4 ${isMobile ? "text-sm" : "text-base"}`}>
        <div className="text-center">
          <p className="font-semibold text-gray-400">Pedaleos</p>
          <p className={`font-bold text-white ${isMobile ? "text-xl" : "text-2xl"}`}>{gameState.clickCounter}</p>
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-400">Velocidad</p>
          <p className={`font-bold text-white ${isMobile ? "text-xl" : "text-2xl"}`}>
            {Math.round(gameState.scrollSpeed * 20)} km/h
          </p>
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-400">Tiempo</p>
          <p className={`font-bold text-white ${isMobile ? "text-xl" : "text-2xl"}`}>
            {Math.floor(gameState.gameTime)}s
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        <Button onClick={resetGame} variant="outline" size={isMobile ? "sm" : "default"}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reiniciar
        </Button>
        <Button onClick={shareGame} variant="outline" size={isMobile ? "sm" : "default"}>
          <Share2 className="w-4 h-4 mr-2" />
          Compartir
        </Button>
        <Button
          onClick={() => window.open("https://github.com", "_blank")}
          variant="outline"
          size={isMobile ? "sm" : "default"}
        >
          <Github className="w-4 h-4 mr-2" />
          GitHub
        </Button>
      </div>

      <div className={`mt-4 text-gray-500 text-center max-w-md ${isMobile ? "text-xs" : "text-sm"}`}>
        <p>
          {isMobile
            ? "Toca repetidamente para pedalear. ¡Consigue el mayor número de pedaleos posible!"
            : "Haz click repetidamente para pedalear. ¡Consigue el mayor número de pedaleos posible!"}
        </p>
      </div>
    </div>
  )
}
