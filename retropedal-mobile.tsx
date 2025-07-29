"use client"

import { useEffect, useRef, useState, useCallback } from "react"

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
  connectionStatus: string
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

export default function RetroPedalMobile() {
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
    connectionStatus: "Conectado",
  })

  const [isMobile, setIsMobile] = useState(false)
  const [mountainImage, setMountainImage] = useState<HTMLImageElement | null>(null)

  // Detectar si es dispositivo móvil
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const mobileKeywords = ["mobile", "android", "iphone", "ipad", "tablet"]
      return mobileKeywords.some((keyword) => userAgent.includes(keyword)) || window.innerWidth < 768
    }

    setIsMobile(checkMobile())

    // Simular conexión de red
    setGameState((prev) => ({ ...prev, connectionStatus: "Conectado" }))

    // Configurar viewport para móviles
    if (checkMobile()) {
      const viewport = document.querySelector('meta[name="viewport"]')
      if (viewport) {
        viewport.setAttribute("content", "width=device-width, initial-scale=1.0, user-scalable=no")
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

  // Dibujar carretera en perspectiva (optimizada para móviles)
  const drawRoad = (ctx: CanvasRenderingContext2D, offset: number, speed: number) => {
    // Cielo
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_CONFIG.height / 2)
    gradient.addColorStop(0, "#87CEEB")
    gradient.addColorStop(1, "#E0F6FF")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height / 2)

    // Montañas realistas con parallax
    if (mountainImage) {
      const mountainWidth = mountainImage.width
      const mountainHeight = mountainImage.height
      const scaleFactor = GAME_CONFIG.height / 2 / mountainHeight
      const scaledWidth = mountainWidth * scaleFactor
      const scaledHeight = mountainHeight * scaleFactor

      const mountainOffset = (offset * 0.05) % scaledWidth

      for (let i = -1; i <= Math.ceil(GAME_CONFIG.width / scaledWidth) + 1; i++) {
        const x = i * scaledWidth - mountainOffset
        const y = GAME_CONFIG.height / 2 - scaledHeight
        ctx.drawImage(mountainImage, x, y, scaledWidth, scaledHeight)
      }
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

    // Líneas de la carretera (simplificadas para mejor rendimiento en móviles)
    ctx.strokeStyle = "#FFFF00"
    ctx.lineWidth = 4

    const segmentLength = 40
    const gapLength = 30
    const totalSegment = segmentLength + gapLength

    for (let i = 0; i < 15; i++) {
      const progress = i / 15
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

    // Bordes y césped (simplificados)
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

    ctx.fillStyle = "#228B22"
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

  // Dibujar volante (optimizado para móviles)
  const drawSteeringWheel = (ctx: CanvasRenderingContext2D) => {
    const centerX = 400
    const centerY = 500
    const scale = isMobile ? 1.0 : 1.2

    ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
    ctx.beginPath()
    ctx.arc(centerX + 3, centerY + 3, 60 * scale, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = "#2C1810"
    ctx.lineWidth = 10 * scale
    ctx.beginPath()
    ctx.arc(centerX, centerY, 60 * scale, 0, Math.PI * 2)
    ctx.stroke()

    ctx.strokeStyle = "#8B4513"
    ctx.lineWidth = 6 * scale
    ctx.beginPath()
    ctx.arc(centerX, centerY, 60 * scale, 0, Math.PI * 2)
    ctx.stroke()

    // Radios simplificados
    ctx.strokeStyle = "#2C1810"
    ctx.lineWidth = 3 * scale
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2
      const startX = centerX + Math.cos(angle) * 20 * scale
      const startY = centerY + Math.sin(angle) * 20 * scale
      const endX = centerX + Math.cos(angle) * 55 * scale
      const endY = centerY + Math.sin(angle) * 55 * scale

      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.lineTo(endX, endY)
      ctx.stroke()
    }

    ctx.fillStyle = "#2C1810"
    ctx.beginPath()
    ctx.arc(centerX, centerY, 20 * scale, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = "#FFD700"
    ctx.font = `${12 * scale}px Arial`
    ctx.textAlign = "center"
    ctx.fillText("RP", centerX, centerY + 4)
  }

  // Dibujar pedales
  const drawPedals = (ctx: CanvasRenderingContext2D, animationState: GameState["pedalAnimation"]) => {
    const pedalX = 350
    const pedalY = 550
    const pedalWidth = isMobile ? 80 : 100
    const pedalHeight = isMobile ? 25 : 30

    let pedalOffset = 0
    if (animationState.active) {
      pedalOffset = animationState.currentFrame === 0 ? -4 : 4
    }

    ctx.fillStyle = "#2C1810"
    ctx.fillRect(pedalX - 10, pedalY + pedalOffset, pedalWidth / 2 - 5, pedalHeight)
    ctx.fillRect(pedalX + pedalWidth / 2 + 5, pedalY - pedalOffset, pedalWidth / 2 - 5, pedalHeight)

    ctx.fillStyle = "#666"
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(pedalX - 5 + i * 6, pedalY + pedalOffset + 4, 2, 17)
      ctx.fillRect(pedalX + pedalWidth / 2 + 8 + i * 6, pedalY - pedalOffset + 4, 2, 17)
    }
  }

  // Dibujar UI (optimizada para móviles)
  const drawUI = (ctx: CanvasRenderingContext2D, clickCounter: number, speed: number, connectionStatus: string) => {
    const fontSize = isMobile ? 24 : 28
    const smallFontSize = isMobile ? 16 : 20

    // Estado de conexión
    ctx.fillStyle = connectionStatus === "Conectado" ? "#00FF00" : "#FF0000"
    ctx.font = `${smallFontSize}px monospace`
    ctx.textAlign = "left"
    ctx.fillText(`● ${connectionStatus}`, 20, GAME_CONFIG.height - 20)

    // Contador de pedaleos
    ctx.fillStyle = "#FFFFFF"
    ctx.strokeStyle = "#000000"
    ctx.lineWidth = 2
    ctx.font = `${fontSize}px monospace`
    ctx.textAlign = "right"

    const text = `Pedaleos: ${clickCounter}`
    const textX = isMobile ? GAME_CONFIG.width - 20 : 700
    ctx.strokeText(text, textX, 30)
    ctx.fillText(text, textX, 30)

    // Velocímetro
    ctx.font = `${smallFontSize}px monospace`
    ctx.textAlign = "left"
    const speedText = `${Math.round(speed * 20)} km/h`
    ctx.strokeText(speedText, 20, 30)
    ctx.fillText(speedText, 20, 30)

    // Barra de velocidad
    const barWidth = isMobile ? 150 : 200
    const barHeight = isMobile ? 15 : 20
    const barX = 20
    const barY = isMobile ? 40 : 50

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
    drawUI(ctx, gameState.clickCounter, gameState.scrollSpeed, gameState.connectionStatus)

    // Efectos de velocidad reducidos para móviles
    if (gameState.scrollSpeed > 2 && !isMobile) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${(gameState.scrollSpeed / GAME_CONFIG.maxScrollSpeed) * 0.2})`
      ctx.lineWidth = 1
      for (let i = 0; i < 5; i++) {
        const x = Math.random() * GAME_CONFIG.width
        const y = Math.random() * GAME_CONFIG.height
        const length = gameState.scrollSpeed * 8

        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x, y + length)
        ctx.stroke()
      }
    }
  }, [gameState, isMobile])

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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-2">
      <div className="mb-4 text-center">
        <h1 className={`font-bold text-white mb-2 ${isMobile ? "text-2xl" : "text-4xl"}`}>RetroPedal</h1>
        <p className={`text-gray-300 ${isMobile ? "text-sm" : "text-base"}`}>
          {isMobile ? "¡Toca la pantalla para pedalear!" : "¡Haz click en la pantalla para pedalear!"}
        </p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <div
            className={`w-2 h-2 rounded-full ${
              gameState.connectionStatus === "Conectado" ? "bg-green-500 animate-pulse" : "bg-red-500"
            }`}
          />
          <span className="text-xs text-gray-400">{gameState.connectionStatus}</span>
        </div>
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

      <div className={`mt-4 text-gray-400 text-center ${isMobile ? "text-xs" : "text-sm"} max-w-md`}>
        <p>
          {isMobile
            ? "Toca repetidamente para pedalear y mantener la velocidad"
            : "Haz click repetidamente para pedalear y mantener la velocidad"}
        </p>
      </div>

      <div className={`mt-2 grid grid-cols-2 gap-4 ${isMobile ? "text-xs" : "text-sm"} text-gray-500`}>
        <div className="text-center">
          <p className="font-semibold">Pedaleos</p>
          <p className={`font-bold text-white ${isMobile ? "text-lg" : "text-2xl"}`}>{gameState.clickCounter}</p>
        </div>
        <div className="text-center">
          <p className="font-semibold">Velocidad</p>
          <p className={`font-bold text-white ${isMobile ? "text-lg" : "text-2xl"}`}>
            {Math.round(gameState.scrollSpeed * 20)} km/h
          </p>
        </div>
      </div>
    </div>
  )
}
