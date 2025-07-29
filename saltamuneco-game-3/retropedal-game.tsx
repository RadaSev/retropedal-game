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
}

const GAME_CONFIG = {
  width: 800,
  height: 600,
  maxScrollSpeed: 5,
  deceleration: 0.1,
  speedIncrease: 0.5,
  pedalFrameRate: 10,
  idleTimeout: 200, // ms sin click para considerar idle
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
  })

  const [mountainImage, setMountainImage] = useState<HTMLImageElement | null>(null)

  // Cargar imagen de montañas
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => setMountainImage(img)
    img.src = "/images/mountains.png"
  }, [])

  // Dibujar carretera en perspectiva
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

      // Parallax lento para las montañas
      const mountainOffset = (offset * 0.05) % scaledWidth

      // Dibujar múltiples copias para efecto continuo
      for (let i = -1; i <= Math.ceil(GAME_CONFIG.width / scaledWidth) + 1; i++) {
        const x = i * scaledWidth - mountainOffset
        const y = GAME_CONFIG.height / 2 - scaledHeight

        ctx.drawImage(mountainImage, x, y, scaledWidth, scaledHeight)
      }
    } else {
      // Fallback: montañas simples mientras carga la imagen
      ctx.fillStyle = "#8B7355"
      ctx.beginPath()
      for (let i = 0; i < GAME_CONFIG.width + 100; i += 50) {
        const x = i + ((offset * 0.1) % 100)
        const height = 80 + Math.sin(i * 0.01) * 20
        ctx.lineTo(x, GAME_CONFIG.height / 2 - height)
      }
      ctx.lineTo(GAME_CONFIG.width, GAME_CONFIG.height / 2)
      ctx.lineTo(0, GAME_CONFIG.height / 2)
      ctx.closePath()
      ctx.fill()
    }

    // Resto del código de la carretera permanece igual...
    const roadWidth = GAME_CONFIG.width
    const roadHeight = GAME_CONFIG.height / 2
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
    ctx.strokeStyle = "#FFFF00"
    ctx.lineWidth = 4

    // Línea central discontinua
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

    // Borde izquierdo
    ctx.beginPath()
    ctx.moveTo(GAME_CONFIG.width / 2 - 1, vanishingPointY)
    ctx.lineTo(50, GAME_CONFIG.height)
    ctx.stroke()

    // Borde derecho
    ctx.beginPath()
    ctx.moveTo(GAME_CONFIG.width / 2 + 1, vanishingPointY)
    ctx.lineTo(GAME_CONFIG.width - 50, GAME_CONFIG.height)
    ctx.stroke()

    // Césped a los lados
    ctx.fillStyle = "#228B22"
    // Lado izquierdo
    ctx.beginPath()
    ctx.moveTo(0, vanishingPointY)
    ctx.lineTo(GAME_CONFIG.width / 2 - 1, vanishingPointY)
    ctx.lineTo(50, GAME_CONFIG.height)
    ctx.lineTo(0, GAME_CONFIG.height)
    ctx.closePath()
    ctx.fill()

    // Lado derecho
    ctx.beginPath()
    ctx.moveTo(GAME_CONFIG.width, vanishingPointY)
    ctx.lineTo(GAME_CONFIG.width / 2 + 1, vanishingPointY)
    ctx.lineTo(GAME_CONFIG.width - 50, GAME_CONFIG.height)
    ctx.lineTo(GAME_CONFIG.width, GAME_CONFIG.height)
    ctx.closePath()
    ctx.fill()
  }

  // Dibujar volante/manillar
  const drawSteeringWheel = (ctx: CanvasRenderingContext2D) => {
    const centerX = 400
    const centerY = 500
    const scale = 1.2

    // Sombra del volante
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
    ctx.beginPath()
    ctx.arc(centerX + 5, centerY + 5, 80 * scale, 0, Math.PI * 2)
    ctx.fill()

    // Volante exterior
    ctx.strokeStyle = "#2C1810"
    ctx.lineWidth = 12 * scale
    ctx.beginPath()
    ctx.arc(centerX, centerY, 80 * scale, 0, Math.PI * 2)
    ctx.stroke()

    // Volante interior (agarre)
    ctx.strokeStyle = "#8B4513"
    ctx.lineWidth = 8 * scale
    ctx.beginPath()
    ctx.arc(centerX, centerY, 80 * scale, 0, Math.PI * 2)
    ctx.stroke()

    // Radios del volante
    ctx.strokeStyle = "#2C1810"
    ctx.lineWidth = 4 * scale
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2
      const startX = centerX + Math.cos(angle) * 25 * scale
      const startY = centerY + Math.sin(angle) * 25 * scale
      const endX = centerX + Math.cos(angle) * 75 * scale
      const endY = centerY + Math.sin(angle) * 75 * scale

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

    // Logo en el centro
    ctx.fillStyle = "#FFD700"
    ctx.font = `${16 * scale}px Arial`
    ctx.textAlign = "center"
    ctx.fillText("RP", centerX, centerY + 5)
  }

  // Dibujar pedales
  const drawPedals = (ctx: CanvasRenderingContext2D, animationState: GameState["pedalAnimation"]) => {
    const pedalX = 350
    const pedalY = 550
    const pedalWidth = 100
    const pedalHeight = 30

    // Determinar posición del pedal basado en la animación
    let pedalOffset = 0
    if (animationState.active) {
      pedalOffset = animationState.currentFrame === 0 ? -5 : 5
    }

    // Pedal izquierdo
    ctx.fillStyle = "#2C1810"
    ctx.fillRect(pedalX - 10, pedalY + pedalOffset, pedalWidth / 2 - 5, pedalHeight)

    // Pedal derecho
    ctx.fillStyle = "#2C1810"
    ctx.fillRect(pedalX + pedalWidth / 2 + 5, pedalY - pedalOffset, pedalWidth / 2 - 5, pedalHeight)

    // Detalles de los pedales
    ctx.fillStyle = "#666"
    for (let i = 0; i < 3; i++) {
      // Pedal izquierdo
      ctx.fillRect(pedalX - 5 + i * 8, pedalY + pedalOffset + 5, 2, 20)
      // Pedal derecho
      ctx.fillRect(pedalX + pedalWidth / 2 + 10 + i * 8, pedalY - pedalOffset + 5, 2, 20)
    }
  }

  // Dibujar UI
  const drawUI = (ctx: CanvasRenderingContext2D, clickCounter: number, speed: number) => {
    // Contador de pedaleos
    ctx.fillStyle = "#FFFFFF"
    ctx.strokeStyle = "#000000"
    ctx.lineWidth = 2
    ctx.font = "28px monospace"
    ctx.textAlign = "left"

    const text = `Pedaleos: ${clickCounter}`
    ctx.strokeText(text, 700, 30)
    ctx.fillText(text, 700, 30)

    // Velocímetro
    ctx.font = "20px monospace"
    const speedText = `Velocidad: ${Math.round(speed * 20)} km/h`
    ctx.strokeText(speedText, 20, 30)
    ctx.fillText(speedText, 20, 30)

    // Barra de velocidad
    const barWidth = 200
    const barHeight = 20
    const barX = 20
    const barY = 50

    // Fondo de la barra
    ctx.fillStyle = "#333"
    ctx.fillRect(barX, barY, barWidth, barHeight)

    // Barra de velocidad
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
  }

  // Manejar click
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

      // Verificar si está en idle
      const isIdle = currentTime - newState.lastClickTime > GAME_CONFIG.idleTimeout

      if (isIdle) {
        newState.isClicking = false
        newState.pedalAnimation.active = false
      }

      // Actualizar velocidad
      if (!newState.isClicking && newState.scrollSpeed > 0) {
        newState.scrollSpeed = Math.max(0, newState.scrollSpeed - GAME_CONFIG.deceleration * deltaTime * 60)
      }

      // Actualizar offset de la carretera
      newState.roadOffset += newState.scrollSpeed * deltaTime * 60

      // Actualizar animación de pedales
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

    // Limpiar canvas
    ctx.clearRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height)

    // Dibujar carretera
    drawRoad(ctx, gameState.roadOffset, gameState.scrollSpeed)

    // Dibujar pedales
    drawPedals(ctx, gameState.pedalAnimation)

    // Dibujar volante
    drawSteeringWheel(ctx)

    // Dibujar UI
    drawUI(ctx, gameState.clickCounter, gameState.scrollSpeed)

    // Efecto de velocidad (líneas de movimiento)
    if (gameState.scrollSpeed > 2) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${(gameState.scrollSpeed / GAME_CONFIG.maxScrollSpeed) * 0.3})`
      ctx.lineWidth = 2
      for (let i = 0; i < 10; i++) {
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

  // Manejar eventos de click
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleCanvasClick = (e: MouseEvent) => {
      e.preventDefault()
      handleClick()
    }

    canvas.addEventListener("click", handleCanvasClick)
    canvas.addEventListener("touchstart", handleCanvasClick)

    return () => {
      canvas.removeEventListener("click", handleCanvasClick)
      canvas.removeEventListener("touchstart", handleCanvasClick)
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="mb-4">
        <h1 className="text-4xl font-bold text-white text-center mb-2">RetroPedal</h1>
        <p className="text-center text-gray-300">¡Haz click en la pantalla para pedalear y ganar velocidad!</p>
      </div>

      <div className="border-4 border-gray-600 rounded-lg overflow-hidden shadow-2xl">
        <canvas
          ref={canvasRef}
          width={GAME_CONFIG.width}
          height={GAME_CONFIG.height}
          className="block cursor-pointer"
          style={{ imageRendering: "pixelated" }}
        />
      </div>

      <div className="mt-4 text-sm text-gray-400 text-center max-w-md">
        <p>
          Haz click repetidamente para pedalear y mantener la velocidad. ¡Deja de hacer click y la bicicleta se
          desacelerará!
        </p>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-4 text-xs text-gray-500">
        <div className="text-center">
          <p className="font-semibold">Pedaleos</p>
          <p className="text-2xl font-bold text-white">{gameState.clickCounter}</p>
        </div>
        <div className="text-center">
          <p className="font-semibold">Velocidad</p>
          <p className="text-2xl font-bold text-white">{Math.round(gameState.scrollSpeed * 20)} km/h</p>
        </div>
      </div>
    </div>
  )
}
