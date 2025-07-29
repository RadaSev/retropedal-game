"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Share2, Github } from "lucide-react"

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
  })

  const [isMobile, setIsMobile] = useState(false)
  const [mountainImage, setMountainImage] = useState<HTMLImageElement | null>(null)
  const [showShareMenu, setShowShareMenu] = useState(false)

  // Detectar dispositivo móvil y cargar high score
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const mobileKeywords = ["mobile", "android", "iphone", "ipad", "tablet"]
      return mobileKeywords.some((keyword) => userAgent.includes(keyword)) || window.innerWidth < 768
    }

    setIsMobile(checkMobile())

    // Cargar high score del localStorage
    const savedHighScore = localStorage.getItem("retropedal-highscore")
    if (savedHighScore) {
      setGameState((prev) => ({ ...prev, highScore: Number.parseInt(savedHighScore) }))
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
    img.src = "/placeholder.svg?height=300&width=800"
  }, [])

  // Guardar high score
  useEffect(() => {
    if (gameState.clickCounter > gameState.highScore) {
      const newHighScore = gameState.clickCounter
      setGameState((prev) => ({ ...prev, highScore: newHighScore }))
      localStorage.setItem("retropedal-highscore", newHighScore.toString())
    }
  }, [gameState.clickCounter, gameState.highScore])

  // Dibujar carretera en perspectiva
  const drawRoad = (ctx: CanvasRenderingContext2D, offset: number, speed: number) => {
    // Cielo con gradiente dinámico basado en velocidad
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
    }

    // Carretera con perspectiva mejorada
    const vanishingPointY = GAME_CONFIG.height / 2

    // Asfalto con textura
    ctx.fillStyle = "#404040"
    ctx.beginPath()
    ctx.moveTo(GAME_CONFIG.width / 2 - 2, vanishingPointY)
    ctx.lineTo(GAME_CONFIG.width / 2 + 2, vanishingPointY)
    ctx.lineTo(GAME_CONFIG.width, GAME_CONFIG.height)
    ctx.lineTo(0, GAME_CONFIG.height)
    ctx.closePath()
    ctx.fill()

    // Líneas de la carretera con efecto de velocidad
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

    // Bordes de la carretera
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

    // Césped con variación de color basada en velocidad
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

  // Dibujar volante con detalles mejorados
  const drawSteeringWheel = (ctx: CanvasRenderingContext2D) => {
    const centerX = 400
    const centerY = 500
    const scale = isMobile ? 1.0 : 1.2

    // Sombra
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)"
    ctx.beginPath()
    ctx.arc(centerX + 4, centerY + 4, 70 * scale, 0, Math.PI * 2)
    ctx.fill()

    // Volante exterior
    ctx.strokeStyle = "#2C1810"
    ctx.lineWidth = 12 * scale
    ctx.beginPath()
    ctx.arc(centerX, centerY, 70 * scale, 0, Math.PI * 2)
    ctx.stroke()

    // Volante interior (agarre)
    ctx.strokeStyle = "#8B4513"
    ctx.lineWidth = 8 * scale
    ctx.beginPath()
    ctx.arc(centerX, centerY, 70 * scale, 0, Math.PI * 2)
    ctx.stroke()

    // Radios del volante
    ctx.strokeStyle = "#2C1810"
    ctx.lineWidth = 4 * scale
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2
      const startX = centerX + Math.cos(angle) * 25 * scale
      const startY = centerY + Math.sin(angle) * 25 * scale
      const endX = centerX + Math.cos(angle) * 65 * scale
      const endY = centerY + Math.sin(angle) * 65 * scale

      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.lineTo(endX, endY)
      ctx.stroke()
    }

    // Centro del volante
    ctx.fillStyle = "#2C1810"
    ctx.beginPath()
    ctx.arc(centerX, centerY, 25 * scale, 0, Math.PI * 2)
    ctx.fill()

    // Logo mejorado
    ctx.fillStyle = "#FFD700"
    ctx.font = `bold ${14 * scale}px Arial`
    ctx.textAlign = "center"
    ctx.fillText("RP", centerX, centerY + 5)
  }

  // Dibujar pedales con animación mejorada
  const drawPedals = (ctx: CanvasRenderingContext2D, animationState: GameState["pedalAnimation"]) => {
    const pedalX = 350
    const pedalY = 550
    const pedalWidth = isMobile ? 80 : 100
    const pedalHeight = isMobile ? 25 : 30

    let pedalOffset = 0
    if (animationState.active) {
      pedalOffset = animationState.currentFrame === 0 ? -6 : 6
    }

    // Sombras de los pedales
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
    ctx.fillRect(pedalX - 8, pedalY + pedalOffset + 2, pedalWidth / 2 - 5, pedalHeight)
    ctx.fillRect(pedalX + pedalWidth / 2 + 7, pedalY - pedalOffset + 2, pedalWidth / 2 - 5, pedalHeight)

    // Pedales
    ctx.fillStyle = "#2C1810"
    ctx.fillRect(pedalX - 10, pedalY + pedalOffset, pedalWidth / 2 - 5, pedalHeight)
    ctx.fillRect(pedalX + pedalWidth / 2 + 5, pedalY - pedalOffset, pedalWidth / 2 - 5, pedalHeight)

    // Detalles de los pedales
    ctx.fillStyle = "#666"
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(pedalX - 5 + i * 7, pedalY + pedalOffset + 4, 2, 18)
      ctx.fillRect(pedalX + pedalWidth / 2 + 10 + i * 7, pedalY - pedalOffset + 4, 2, 18)
    }
  }

  // Dibujar UI mejorada
  const drawUI = (ctx: CanvasRenderingContext2D, clickCounter: number, speed: number, highScore: number) => {
    const fontSize = isMobile ? 20 : 24
    const smallFontSize = isMobile ? 14 : 18

    // Fondo semi-transparente para la UI
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
    ctx.fillRect(0, 0, GAME_CONFIG.width, 80)

    // Contador de pedaleos
    ctx.fillStyle = "#FFFFFF"
    ctx.strokeStyle = "#000000"
    ctx.lineWidth = 2
    ctx.font = `bold ${fontSize}px monospace`
    ctx.textAlign = "right"

    const text = `Pedaleos: ${clickCounter}`
    const textX = GAME_CONFIG.width - 20
    ctx.strokeText(text, textX, 30)
    ctx.fillText(text, textX, 30)

    // High Score
    if (highScore > 0) {
      ctx.font = `${smallFontSize}px monospace`
      const highScoreText = `Récord: ${highScore}`
      ctx.strokeText(highScoreText, textX, 55)
      ctx.fillText(highScoreText, textX, 55)
    }

    // Velocímetro
    ctx.font = `bold ${fontSize}px monospace`
    ctx.textAlign = "left"
    const speedText = `${Math.round(speed * 20)} km/h`
    ctx.strokeText(speedText, 20, 30)
    ctx.fillText(speedText, 20, 30)

    // Barra de velocidad mejorada
    const barWidth = isMobile ? 150 : 200
    const barHeight = isMobile ? 12 : 16
    const barX = 20
    const barY = isMobile ? 40 : 45

    // Fondo de la barra
    ctx.fillStyle = "#333"
    ctx.fillRect(barX, barY, barWidth, barHeight)

    // Barra de velocidad con gradiente dinámico
    const speedPercent = speed / GAME_CONFIG.maxScrollSpeed
    const speedBarWidth = barWidth * speedPercent

    const speedGradient = ctx.createLinearGradient(barX, barY, barX + speedBarWidth, barY)
    speedGradient.addColorStop(0, "#00FF00")
    speedGradient.addColorStop(0.5, "#FFFF00")
    speedGradient.addColorStop(1, "#FF0000")

    ctx.fillStyle = speedGradient
    ctx.fillRect(barX, barY, speedBarWidth, barHeight)

    // Borde de la barra
    ctx.strokeStyle = "#FFF"
    ctx.lineWidth = 2
    ctx.strokeRect(barX, barY, barWidth, barHeight)

    // Indicador de nuevo récord
    if (clickCounter > highScore && clickCounter > 0) {
      ctx.fillStyle = "#FFD700"
      ctx.font = `bold ${smallFontSize}px Arial`
      ctx.textAlign = "center"
      ctx.fillText("¡NUEVO RÉCORD!", GAME_CONFIG.width / 2, 70)
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
    drawUI(ctx, gameState.clickCounter, gameState.scrollSpeed, gameState.highScore)

    // Efectos de velocidad mejorados
    if (gameState.scrollSpeed > 2) {
      const intensity = gameState.scrollSpeed / GAME_CONFIG.maxScrollSpeed
      ctx.strokeStyle = `rgba(255, 255, 255, ${intensity * 0.4})`
      ctx.lineWidth = 2

      const lineCount = Math.floor(intensity * 8)
      for (let i = 0; i < lineCount; i++) {
        const x = Math.random() * GAME_CONFIG.width
        const y = Math.random() * GAME_CONFIG.height
        const length = gameState.scrollSpeed * 12

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

  // Manejar eventos de click/touch
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

  // Funciones para compartir
  const shareGame = async () => {
    const url = window.location.href
    const text = `¡Acabo de conseguir ${gameState.clickCounter} pedaleos en RetroPedal! 🚴‍♂️ ¿Puedes superarme?`

    if (navigator.share) {
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
      alert("¡Enlace copiado al portapapeles!")
    }
  }

  const resetGame = () => {
    setGameState((prev) => ({
      ...prev,
      clickCounter: 0,
      scrollSpeed: 0,
      roadOffset: 0,
      isClicking: false,
      pedalAnimation: {
        ...prev.pedalAnimation,
        active: false,
        currentFrame: 0,
      },
    }))
  }

  // Calcular tamaño del canvas para móviles
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
          {isMobile ? "¡Toca la pantalla para pedalear!" : "¡Haz click en la pantalla para pedalear!"}
        </p>
        {gameState.highScore > 0 && (
          <p className="text-yellow-400 text-sm">🏆 Tu récord: {gameState.highScore} pedaleos</p>
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

      <div className={`mt-4 grid grid-cols-2 gap-6 ${isMobile ? "text-sm" : "text-base"}`}>
        <div className="text-center">
          <p className="font-semibold text-gray-400">Pedaleos</p>
          <p className={`font-bold text-white ${isMobile ? "text-2xl" : "text-3xl"}`}>{gameState.clickCounter}</p>
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-400">Velocidad</p>
          <p className={`font-bold text-white ${isMobile ? "text-2xl" : "text-3xl"}`}>
            {Math.round(gameState.scrollSpeed * 20)} km/h
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        <Button onClick={resetGame} variant="outline" size={isMobile ? "sm" : "default"}>
          🔄 Reiniciar
        </Button>
        <Button onClick={shareGame} variant="outline" size={isMobile ? "sm" : "default"}>
          <Share2 className="w-4 h-4 mr-2" />
          Compartir
        </Button>
        <Button
          onClick={() => window.open("https://github.com/tu-usuario/retropedal-game", "_blank")}
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
            ? "Toca repetidamente para pedalear y mantener la velocidad. ¡Consigue el mayor número de pedaleos!"
            : "Haz click repetidamente para pedalear y mantener la velocidad. ¡Consigue el mayor número de pedaleos!"}
        </p>
      </div>
    </div>
  )
}
