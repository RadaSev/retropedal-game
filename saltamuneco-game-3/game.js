// Configuración del juego
const GAME_CONFIG = {
  width: 800,
  height: 600,
  maxScrollSpeed: 5,
  deceleration: 0.1,
  speedIncrease: 0.5,
  pedalFrameRate: 10,
  idleTimeout: 200,
}

// Estado del juego
const gameState = {
  scrollSpeed: 0,
  clickCounter: 0,
  pedalAnimation: {
    active: false,
    currentFrame: 0,
    frameTimer: 0,
  },
  roadOffset: 0,
  isClicking: false,
  lastClickTime: 0,
  highScore: 0,
  gameTime: 0,
  isRunning: false,
}

// Variables del DOM
let canvas, ctx
let clickCounterEl, speedDisplayEl, timeDisplayEl, highScoreEl, highScoreValueEl
let resetBtn, shareBtn, fullscreenBtn
let newRecordNotification, loadingScreen
let isMobile = false
let mountainImage = null

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  initializeGame()
})

function initializeGame() {
  // Mostrar pantalla de carga
  loadingScreen = document.getElementById("loadingScreen")

  // Detectar dispositivo móvil
  isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth < 768

  // Obtener elementos del DOM
  canvas = document.getElementById("gameCanvas")
  ctx = canvas.getContext("2d")

  clickCounterEl = document.getElementById("clickCounter")
  speedDisplayEl = document.getElementById("speedDisplay")
  timeDisplayEl = document.getElementById("timeDisplay")
  highScoreEl = document.getElementById("highScoreDisplay")
  highScoreValueEl = document.getElementById("highScoreValue")

  resetBtn = document.getElementById("resetBtn")
  shareBtn = document.getElementById("shareBtn")
  fullscreenBtn = document.getElementById("fullscreenBtn")
  newRecordNotification = document.getElementById("newRecordNotification")

  // Configurar canvas para móviles
  if (isMobile) {
    document.getElementById("gameInstructions").textContent = "¡Toca la pantalla para pedalear!"
    canvas.style.width = "100%"
    canvas.style.height = "auto"
  }

  // Cargar high score
  loadHighScore()

  // Crear imagen de montañas
  createMountainImage()

  // Configurar event listeners
  setupEventListeners()

  // Ocultar pantalla de carga después de un momento
  setTimeout(() => {
    loadingScreen.style.display = "none"
    startGameLoop()
  }, 1500)
}

function createMountainImage() {
  mountainImage = new Image()
  mountainImage.onload = () => {
    console.log("Imagen de montañas cargada")
  }

  // Crear SVG de montañas
  const svgData = `
        <svg width="800" height="300" viewBox="0 0 800 300" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="mountainGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#8B7355;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#5D4E37;stop-opacity:1" />
                </linearGradient>
            </defs>
            <path d="M0 300L50 250L100 200L150 150L200 100L250 50L300 100L350 150L400 200L450 250L500 200L550 150L600 100L650 50L700 100L750 150L800 200V300H0Z" fill="url(#mountainGradient)"/>
            <path d="M0 300L80 220L160 180L240 120L320 80L400 120L480 180L560 220L640 180L720 120L800 160V300H0Z" fill="#6B5B47" opacity="0.7"/>
        </svg>
    `

  mountainImage.src = "data:image/svg+xml;base64," + btoa(svgData)
}

function setupEventListeners() {
  // Click/Touch en canvas
  canvas.addEventListener("click", handleClick)
  canvas.addEventListener("touchstart", handleTouch)
  canvas.addEventListener("touchend", preventDefault)

  // Botones
  resetBtn.addEventListener("click", resetGame)
  shareBtn.addEventListener("click", shareGame)
  fullscreenBtn.addEventListener("click", toggleFullscreen)

  // Prevenir zoom en móviles
  document.addEventListener("touchstart", (e) => {
    if (e.touches.length > 1) {
      e.preventDefault()
    }
  })

  // Prevenir scroll en móviles
  document.body.addEventListener(
    "touchmove",
    (e) => {
      if (e.target === canvas) {
        e.preventDefault()
      }
    },
    { passive: false },
  )
}

function handleClick(e) {
  e.preventDefault()
  pedal()
}

function handleTouch(e) {
  e.preventDefault()
  pedal()
}

function preventDefault(e) {
  e.preventDefault()
}

function pedal() {
  gameState.clickCounter++
  gameState.scrollSpeed = Math.min(gameState.scrollSpeed + GAME_CONFIG.speedIncrease, GAME_CONFIG.maxScrollSpeed)
  gameState.pedalAnimation.active = true
  gameState.isClicking = true
  gameState.lastClickTime = Date.now()

  // Verificar nuevo récord
  if (gameState.clickCounter > gameState.highScore) {
    if (gameState.highScore > 0) {
      // Solo mostrar si no es la primera vez
      showNewRecordNotification()
    }
    gameState.highScore = gameState.clickCounter
    saveHighScore()
    updateHighScoreDisplay()
  }

  updateUI()
}

function resetGame() {
  gameState.clickCounter = 0
  gameState.scrollSpeed = 0
  gameState.roadOffset = 0
  gameState.isClicking = false
  gameState.gameTime = 0
  gameState.pedalAnimation.active = false
  gameState.pedalAnimation.currentFrame = 0

  updateUI()
}

function shareGame() {
  const url = window.location.href
  const text = `¡Conseguí ${gameState.clickCounter} pedaleos en RetroPedal! 🚴‍♂️ ¿Puedes superarme?`

  if (navigator.share && isMobile) {
    navigator
      .share({
        title: "RetroPedal - Juego de Ciclismo",
        text: text,
        url: url,
      })
      .catch((err) => {
        copyToClipboard(`${text} ${url}`)
      })
  } else {
    copyToClipboard(`${text} ${url}`)
  }
}

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      alert("¡Enlace copiado al portapapeles!")
    })
  } else {
    // Fallback para navegadores antiguos
    const textArea = document.createElement("textarea")
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand("copy")
    document.body.removeChild(textArea)
    alert("¡Enlace copiado!")
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch((err) => {
      console.log("Error al entrar en pantalla completa:", err)
    })
  } else {
    document.exitFullscreen()
  }
}

function loadHighScore() {
  try {
    const saved = localStorage.getItem("retropedal-highscore")
    if (saved) {
      gameState.highScore = Number.parseInt(saved) || 0
      updateHighScoreDisplay()
    }
  } catch (error) {
    console.log("LocalStorage no disponible")
  }
}

function saveHighScore() {
  try {
    localStorage.setItem("retropedal-highscore", gameState.highScore.toString())
  } catch (error) {
    console.log("No se pudo guardar el high score")
  }
}

function updateHighScoreDisplay() {
  if (gameState.highScore > 0) {
    highScoreValueEl.textContent = gameState.highScore
    highScoreEl.classList.add("visible")
  }
}

function showNewRecordNotification() {
  newRecordNotification.style.display = "block"
  setTimeout(() => {
    newRecordNotification.style.display = "none"
  }, 2000)
}

function updateUI() {
  clickCounterEl.textContent = gameState.clickCounter
  speedDisplayEl.textContent = Math.round(gameState.scrollSpeed * 20) + " km/h"
  timeDisplayEl.textContent = Math.floor(gameState.gameTime) + "s"
}

// Game Loop
let lastTime = 0

function startGameLoop() {
  gameState.isRunning = true
  gameLoop(performance.now())
}

function gameLoop(currentTime) {
  if (!gameState.isRunning) return

  const deltaTime = (currentTime - lastTime) / 1000
  lastTime = currentTime

  updateGame(deltaTime)
  render()

  requestAnimationFrame(gameLoop)
}

function updateGame(deltaTime) {
  // Actualizar tiempo de juego
  gameState.gameTime += deltaTime

  // Verificar si está en idle
  const currentTime = Date.now()
  const isIdle = currentTime - gameState.lastClickTime > GAME_CONFIG.idleTimeout

  if (isIdle) {
    gameState.isClicking = false
    gameState.pedalAnimation.active = false
  }

  // Actualizar velocidad (desaceleración)
  if (!gameState.isClicking && gameState.scrollSpeed > 0) {
    gameState.scrollSpeed = Math.max(0, gameState.scrollSpeed - GAME_CONFIG.deceleration * deltaTime * 60)
  }

  // Actualizar offset de la carretera
  gameState.roadOffset += gameState.scrollSpeed * deltaTime * 60

  // Actualizar animación de pedales
  if (gameState.pedalAnimation.active) {
    gameState.pedalAnimation.frameTimer += deltaTime
    if (gameState.pedalAnimation.frameTimer >= 1 / GAME_CONFIG.pedalFrameRate) {
      gameState.pedalAnimation.currentFrame = (gameState.pedalAnimation.currentFrame + 1) % 2
      gameState.pedalAnimation.frameTimer = 0
    }
  }

  updateUI()
}

function render() {
  // Limpiar canvas
  ctx.clearRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height)

  // Dibujar elementos del juego
  drawRoad()
  drawPedals()
  drawSteeringWheel()
  drawSpeedEffects()
}

function drawRoad() {
  const vanishingPointY = GAME_CONFIG.height / 2

  // Cielo con gradiente dinámico
  const skyIntensity = Math.min(gameState.scrollSpeed / GAME_CONFIG.maxScrollSpeed, 1)
  const gradient = ctx.createLinearGradient(0, 0, 0, GAME_CONFIG.height / 2)
  gradient.addColorStop(0, `hsl(200, 70%, ${70 + skyIntensity * 10}%)`)
  gradient.addColorStop(1, `hsl(200, 50%, ${85 + skyIntensity * 5}%)`)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height / 2)

  // Montañas con parallax
  if (mountainImage && mountainImage.complete) {
    const mountainWidth = mountainImage.width
    const mountainHeight = mountainImage.height
    const scaleFactor = GAME_CONFIG.height / 2 / mountainHeight
    const scaledWidth = mountainWidth * scaleFactor
    const scaledHeight = mountainHeight * scaleFactor

    const mountainOffset = (gameState.roadOffset * 0.03) % scaledWidth

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
      const x = i + ((gameState.roadOffset * 0.03) % 100)
      const height = 80 + Math.sin(i * 0.01) * 30
      ctx.lineTo(x, GAME_CONFIG.height / 2 - height)
    }
    ctx.lineTo(GAME_CONFIG.width, GAME_CONFIG.height / 2)
    ctx.lineTo(0, GAME_CONFIG.height / 2)
    ctx.closePath()
    ctx.fill()
  }

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
  ctx.strokeStyle = gameState.scrollSpeed > 3 ? "#FFFF88" : "#FFFF00"
  ctx.lineWidth = 4

  const segmentLength = 40
  const gapLength = 30
  const totalSegment = segmentLength + gapLength

  for (let i = 0; i < 20; i++) {
    const progress = i / 20
    const y = vanishingPointY + (GAME_CONFIG.height - vanishingPointY) * progress
    const width = 4 * progress

    const segmentOffset = (gameState.roadOffset * gameState.scrollSpeed * 2) % totalSegment
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

  // Césped
  const grassColor = gameState.scrollSpeed > 2 ? "#228B22" : "#32CD32"
  ctx.fillStyle = grassColor

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

function drawSteeringWheel() {
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

  // Radios del volante
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

  // Centro del volante
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

function drawPedals() {
  const pedalX = 350
  const pedalY = 550
  const pedalWidth = isMobile ? 70 : 90
  const pedalHeight = isMobile ? 20 : 25

  let pedalOffset = 0
  if (gameState.pedalAnimation.active) {
    pedalOffset = gameState.pedalAnimation.currentFrame === 0 ? -5 : 5
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
    ctx.fillRect(pedalX - 5 + i * 6, pedalY + pedalOffset + 3, 2, 15)
    ctx.fillRect(pedalX + pedalWidth / 2 + 10 + i * 6, pedalY - pedalOffset + 3, 2, 15)
  }
}

function drawSpeedEffects() {
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
}

// Manejo de errores
window.addEventListener("error", (e) => {
  console.error("Error en el juego:", e.error)
})

// Prevenir que la página se recargue accidentalmente
window.addEventListener("beforeunload", (e) => {
  if (gameState.clickCounter > 0) {
    e.preventDefault()
    e.returnValue = ""
  }
})
