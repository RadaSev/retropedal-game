"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"

interface GameState {
  player: {
    x: number
    y: number
    velocityY: number
    isJumping: boolean
    isDucking: boolean
    isRunning: boolean
    animation: string
    invulnerable: boolean
    invulnerabilityTime: number
  }
  obstacles: Array<{
    id: number
    type: "spike" | "enemy"
    x: number
    y: number
    width: number
    height: number
    speed?: number
    direction?: number
  }>
  background: {
    layer1X: number
    layer2X: number
  }
  lives: number
  gameOver: boolean
  score: number
  obstacleSpawnTimer: number
}

const GAME_CONFIG = {
  width: 800,
  height: 450,
  gravity: 900,
  jumpVelocity: -450,
  runSpeed: 200,
  backgroundScrollSpeed: 2,
  groundY: 350,
  playerWidth: 40,
  playerHeight: 60,
  spikeWidth: 30,
  spikeHeight: 30,
  enemyWidth: 50,
  enemyHeight: 60,
}

export default function SaltaMunecoGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameLoopRef = useRef<number>()
  const keysRef = useRef<Set<string>>(new Set())
  const lastTimeRef = useRef<number>(0)

  const [gameState, setGameState] = useState<GameState>({
    player: {
      x: 100,
      y: GAME_CONFIG.groundY - GAME_CONFIG.playerHeight,
      velocityY: 0,
      isJumping: false,
      isDucking: false,
      isRunning: false,
      animation: "idle",
      invulnerable: false,
      invulnerabilityTime: 0,
    },
    obstacles: [],
    background: {
      layer1X: 0,
      layer2X: 0,
    },
    lives: 3,
    gameOver: false,
    score: 0,
    obstacleSpawnTimer: 0,
  })

  // Dibujar stickman
  const drawStickman = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    animation: string,
    invulnerable: boolean,
  ) => {
    ctx.save()

    // Efecto de parpadeo cuando es invulnerable
    if (invulnerable && Math.floor(Date.now() / 100) % 2) {
      ctx.globalAlpha = 0.5
    }

    ctx.strokeStyle = "#000"
    ctx.lineWidth = 3
    ctx.lineCap = "round"

    const centerX = x + GAME_CONFIG.playerWidth / 2
    const centerY = y + GAME_CONFIG.playerHeight / 2

    // Cabeza
    ctx.beginPath()
    ctx.arc(centerX, y + 15, 10, 0, Math.PI * 2)
    ctx.stroke()

    // Cuerpo
    ctx.beginPath()
    ctx.moveTo(centerX, y + 25)
    ctx.lineTo(centerX, y + 45)
    ctx.stroke()

    // Brazos
    const armY = y + 35
    if (animation === "run") {
      // Brazos en movimiento
      const armOffset = Math.sin(Date.now() * 0.01) * 5
      ctx.beginPath()
      ctx.moveTo(centerX, armY)
      ctx.lineTo(centerX - 15 + armOffset, armY - 5)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(centerX, armY)
      ctx.lineTo(centerX + 15 - armOffset, armY - 5)
      ctx.stroke()
    } else if (animation === "jump") {
      // Brazos hacia arriba
      ctx.beginPath()
      ctx.moveTo(centerX, armY)
      ctx.lineTo(centerX - 15, armY - 15)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(centerX, armY)
      ctx.lineTo(centerX + 15, armY - 15)
      ctx.stroke()
    } else {
      // Brazos normales
      ctx.beginPath()
      ctx.moveTo(centerX, armY)
      ctx.lineTo(centerX - 15, armY + 5)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(centerX, armY)
      ctx.lineTo(centerX + 15, armY + 5)
      ctx.stroke()
    }

    // Piernas
    const legY = y + 45
    if (animation === "duck") {
      // Piernas dobladas
      ctx.beginPath()
      ctx.moveTo(centerX, legY)
      ctx.lineTo(centerX - 10, legY + 10)
      ctx.lineTo(centerX - 15, legY + 15)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(centerX, legY)
      ctx.lineTo(centerX + 10, legY + 10)
      ctx.lineTo(centerX + 15, legY + 15)
      ctx.stroke()
    } else if (animation === "run") {
      // Piernas en movimiento
      const legOffset = Math.sin(Date.now() * 0.015) * 8
      ctx.beginPath()
      ctx.moveTo(centerX, legY)
      ctx.lineTo(centerX - 8 + legOffset, legY + 15)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(centerX, legY)
      ctx.lineTo(centerX + 8 - legOffset, legY + 15)
      ctx.stroke()
    } else {
      // Piernas normales
      ctx.beginPath()
      ctx.moveTo(centerX, legY)
      ctx.lineTo(centerX - 8, legY + 15)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(centerX, legY)
      ctx.lineTo(centerX + 8, legY + 15)
      ctx.stroke()
    }

    ctx.restore()
  }

  // Dibujar obstáculos
  const drawObstacle = (ctx: CanvasRenderingContext2D, obstacle: GameState["obstacles"][0]) => {
    ctx.fillStyle = obstacle.type === "spike" ? "#ff4444" : "#444444"

    if (obstacle.type === "spike") {
      // Dibujar pincho como triángulo
      ctx.beginPath()
      ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y)
      ctx.lineTo(obstacle.x, obstacle.y + obstacle.height)
      ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height)
      ctx.closePath()
      ctx.fill()
    } else {
      // Dibujar enemigo como stickman simple
      ctx.strokeStyle = "#444444"
      ctx.lineWidth = 2
      const centerX = obstacle.x + obstacle.width / 2
      const centerY = obstacle.y + obstacle.height / 2

      // Cabeza
      ctx.beginPath()
      ctx.arc(centerX, obstacle.y + 10, 8, 0, Math.PI * 2)
      ctx.stroke()

      // Cuerpo
      ctx.beginPath()
      ctx.moveTo(centerX, obstacle.y + 18)
      ctx.lineTo(centerX, obstacle.y + 40)
      ctx.stroke()

      // Brazos
      ctx.beginPath()
      ctx.moveTo(centerX, obstacle.y + 28)
      ctx.lineTo(centerX - 12, obstacle.y + 25)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(centerX, obstacle.y + 28)
      ctx.lineTo(centerX + 12, obstacle.y + 25)
      ctx.stroke()

      // Piernas
      ctx.beginPath()
      ctx.moveTo(centerX, obstacle.y + 40)
      ctx.lineTo(centerX - 8, obstacle.y + 55)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(centerX, obstacle.y + 40)
      ctx.lineTo(centerX + 8, obstacle.y + 55)
      ctx.stroke()
    }
  }

  // Dibujar fondo con parallax
  const drawBackground = (ctx: CanvasRenderingContext2D, bgState: GameState["background"]) => {
    // Capa 1 (más lenta)
    ctx.fillStyle = "#87CEEB"
    ctx.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height)

    // Nubes simples
    ctx.fillStyle = "#ffffff"
    for (let i = 0; i < 5; i++) {
      const x = (bgState.layer1X * 0.5 + i * 200) % (GAME_CONFIG.width + 100)
      const y = 50 + i * 20
      ctx.beginPath()
      ctx.arc(x, y, 20, 0, Math.PI * 2)
      ctx.arc(x + 25, y, 25, 0, Math.PI * 2)
      ctx.arc(x + 50, y, 20, 0, Math.PI * 2)
      ctx.fill()
    }

    // Capa 2 (suelo)
    ctx.fillStyle = "#90EE90"
    ctx.fillRect(0, GAME_CONFIG.groundY, GAME_CONFIG.width, GAME_CONFIG.height - GAME_CONFIG.groundY)

    // Líneas de césped
    ctx.strokeStyle = "#228B22"
    ctx.lineWidth = 2
    for (let i = 0; i < GAME_CONFIG.width + 50; i += 20) {
      const x = (bgState.layer2X + i) % (GAME_CONFIG.width + 50)
      ctx.beginPath()
      ctx.moveTo(x, GAME_CONFIG.groundY)
      ctx.lineTo(x + 5, GAME_CONFIG.groundY - 10)
      ctx.stroke()
    }
  }

  // Dibujar UI
  const drawUI = (ctx: CanvasRenderingContext2D, lives: number, score: number) => {
    // Vidas (corazones)
    ctx.fillStyle = "#ff0000"
    for (let i = 0; i < lives; i++) {
      const x = 20 + i * 35
      const y = 30

      ctx.beginPath()
      ctx.arc(x, y, 8, 0, Math.PI * 2)
      ctx.arc(x + 12, y, 8, 0, Math.PI * 2)
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(x - 8, y + 5)
      ctx.lineTo(x + 6, y + 18)
      ctx.lineTo(x + 20, y + 5)
      ctx.fill()
    }

    // Puntuación
    ctx.fillStyle = "#000"
    ctx.font = "20px Arial"
    ctx.fillText(`Puntuación: ${score}`, GAME_CONFIG.width - 200, 30)
  }

  // Verificar colisiones
  const checkCollisions = (player: GameState["player"], obstacles: GameState["obstacles"]) => {
    if (player.invulnerable) return null

    for (const obstacle of obstacles) {
      if (
        player.x < obstacle.x + obstacle.width &&
        player.x + GAME_CONFIG.playerWidth > obstacle.x &&
        player.y < obstacle.y + obstacle.height &&
        player.y + GAME_CONFIG.playerHeight > obstacle.y
      ) {
        return obstacle
      }
    }
    return null
  }

  // Actualizar juego
  const updateGame = useCallback(
    (deltaTime: number) => {
      if (gameState.gameOver) return

      setGameState((prevState) => {
        const newState = { ...prevState }

        // Actualizar invulnerabilidad
        if (newState.player.invulnerable) {
          newState.player.invulnerabilityTime -= deltaTime
          if (newState.player.invulnerabilityTime <= 0) {
            newState.player.invulnerable = false
          }
        }

        // Controles del jugador
        const keys = keysRef.current
        let newAnimation = "idle"

        if (keys.has("ArrowLeft")) {
          newState.player.x = Math.max(0, newState.player.x - GAME_CONFIG.runSpeed * deltaTime)
          newAnimation = "run"
          newState.player.isRunning = true
        } else if (keys.has("ArrowRight")) {
          newState.player.x = Math.min(
            GAME_CONFIG.width - GAME_CONFIG.playerWidth,
            newState.player.x + GAME_CONFIG.runSpeed * deltaTime,
          )
          newAnimation = "run"
          newState.player.isRunning = true
        } else {
          newState.player.isRunning = false
        }

        if (keys.has("ArrowDown")) {
          newState.player.isDucking = true
          newAnimation = "duck"
        } else {
          newState.player.isDucking = false
        }

        if (keys.has("ArrowUp") && !newState.player.isJumping) {
          newState.player.velocityY = GAME_CONFIG.jumpVelocity
          newState.player.isJumping = true
          newAnimation = "jump"
        }

        // Física del jugador
        newState.player.velocityY += GAME_CONFIG.gravity * deltaTime
        newState.player.y += newState.player.velocityY * deltaTime

        // Colisión con el suelo
        const groundY = GAME_CONFIG.groundY - GAME_CONFIG.playerHeight
        if (newState.player.y >= groundY) {
          newState.player.y = groundY
          newState.player.velocityY = 0
          newState.player.isJumping = false
        }

        if (newState.player.isJumping) {
          newAnimation = "jump"
        }

        newState.player.animation = newAnimation

        // Actualizar fondo
        newState.background.layer1X -= GAME_CONFIG.backgroundScrollSpeed * 0.5 * deltaTime * 60
        newState.background.layer2X -= GAME_CONFIG.backgroundScrollSpeed * deltaTime * 60

        // Generar obstáculos
        newState.obstacleSpawnTimer += deltaTime
        if (newState.obstacleSpawnTimer > 2) {
          const obstacleType = Math.random() < 0.6 ? "spike" : "enemy"
          const obstacle = {
            id: Date.now(),
            type: obstacleType as "spike" | "enemy",
            x: GAME_CONFIG.width,
            y:
              obstacleType === "spike"
                ? GAME_CONFIG.groundY - GAME_CONFIG.spikeHeight
                : GAME_CONFIG.groundY - GAME_CONFIG.enemyHeight,
            width: obstacleType === "spike" ? GAME_CONFIG.spikeWidth : GAME_CONFIG.enemyWidth,
            height: obstacleType === "spike" ? GAME_CONFIG.spikeHeight : GAME_CONFIG.enemyHeight,
            speed: obstacleType === "enemy" ? 100 : undefined,
            direction: obstacleType === "enemy" ? -1 : undefined,
          }
          newState.obstacles.push(obstacle)
          newState.obstacleSpawnTimer = 0
        }

        // Actualizar obstáculos
        newState.obstacles = newState.obstacles.filter((obstacle) => {
          obstacle.x -= (obstacle.speed || 150) * deltaTime
          return obstacle.x + obstacle.width > 0
        })

        // Verificar colisiones
        const collision = checkCollisions(newState.player, newState.obstacles)
        if (collision) {
          newState.lives -= 1
          newState.player.invulnerable = true
          newState.player.invulnerabilityTime = 2
          newState.player.animation = "hit"

          if (newState.lives <= 0) {
            newState.gameOver = true
          }
        }

        // Actualizar puntuación
        newState.score += Math.floor(deltaTime * 10)

        return newState
      })
    },
    [gameState.gameOver],
  )

  // Renderizar juego
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Limpiar canvas
    ctx.clearRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height)

    // Dibujar fondo
    drawBackground(ctx, gameState.background)

    // Dibujar obstáculos
    gameState.obstacles.forEach((obstacle) => {
      drawObstacle(ctx, obstacle)
    })

    // Dibujar jugador
    drawStickman(ctx, gameState.player.x, gameState.player.y, gameState.player.animation, gameState.player.invulnerable)

    // Dibujar UI
    drawUI(ctx, gameState.lives, gameState.score)

    // Pantalla de game over
    if (gameState.gameOver) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
      ctx.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height)

      ctx.fillStyle = "#fff"
      ctx.font = "48px Arial"
      ctx.textAlign = "center"
      ctx.fillText("¡Game Over!", GAME_CONFIG.width / 2, GAME_CONFIG.height / 2 - 50)

      ctx.font = "24px Arial"
      ctx.fillText(`Puntuación Final: ${gameState.score}`, GAME_CONFIG.width / 2, GAME_CONFIG.height / 2)

      ctx.fillText("Presiona R para reiniciar", GAME_CONFIG.width / 2, GAME_CONFIG.height / 2 + 50)
      ctx.textAlign = "left"
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

  // Reiniciar juego
  const resetGame = useCallback(() => {
    setGameState({
      player: {
        x: 100,
        y: GAME_CONFIG.groundY - GAME_CONFIG.playerHeight,
        velocityY: 0,
        isJumping: false,
        isDucking: false,
        isRunning: false,
        animation: "idle",
        invulnerable: false,
        invulnerabilityTime: 0,
      },
      obstacles: [],
      background: {
        layer1X: 0,
        layer2X: 0,
      },
      lives: 3,
      gameOver: false,
      score: 0,
      obstacleSpawnTimer: 0,
    })
  }, [])

  // Manejo de eventos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code)

      if (e.code === "KeyR" && gameState.gameOver) {
        resetGame()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code)
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [gameState.gameOver, resetGame])

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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="mb-4">
        <h1 className="text-4xl font-bold text-center mb-2">SaltaMuñeco</h1>
        <p className="text-center text-gray-600">
          Usa las flechas para moverte: ← → para correr, ↑ para saltar, ↓ para agacharte
        </p>
      </div>

      <div className="border-4 border-gray-800 rounded-lg overflow-hidden shadow-lg">
        <canvas ref={canvasRef} width={GAME_CONFIG.width} height={GAME_CONFIG.height} className="block" />
      </div>

      {gameState.gameOver && (
        <div className="mt-4">
          <Button onClick={resetGame} size="lg">
            Reiniciar Juego
          </Button>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500 text-center max-w-md">
        <p>Evita los pinchos rojos y los enemigos grises. ¡Consigue la mayor puntuación posible!</p>
      </div>
    </div>
  )
}
