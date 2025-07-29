"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wifi, Smartphone, Monitor, Copy, CheckCircle } from "lucide-react"

interface NetworkInfo {
  localIP: string
  port: number
  isConnected: boolean
  connectionStatus: string
}

export default function NetworkInfo() {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    localIP: "Detectando...",
    port: 3000,
    isConnected: false,
    connectionStatus: "Iniciando servidor...",
  })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Detectar IP local del cliente
    const detectLocalIP = async () => {
      try {
        // Método 1: Usar WebRTC para detectar IP local
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        })

        pc.createDataChannel("")
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        return new Promise<string>((resolve) => {
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              const candidate = event.candidate.candidate
              const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+)/)
              if (ipMatch && !ipMatch[1].startsWith("127.")) {
                pc.close()
                resolve(ipMatch[1])
              }
            }
          }

          // Fallback después de 3 segundos
          setTimeout(() => {
            pc.close()
            resolve(window.location.hostname)
          }, 3000)
        })
      } catch (error) {
        return window.location.hostname
      }
    }

    const initializeNetwork = async () => {
      const ip = await detectLocalIP()
      const port = Number.parseInt(window.location.port) || 3000

      setNetworkInfo({
        localIP: ip,
        port: port,
        isConnected: true,
        connectionStatus: "Servidor activo",
      })
    }

    initializeNetwork()

    // Simular eventos de conexión
    const connectionInterval = setInterval(() => {
      setNetworkInfo((prev) => ({
        ...prev,
        connectionStatus: prev.isConnected ? "Servidor activo - Listo para conexiones" : "Reconectando...",
      }))
    }, 5000)

    return () => clearInterval(connectionInterval)
  }, [])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement("textarea")
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const gameUrl = `http://${networkInfo.localIP}:${networkInfo.port}`

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <Card className="border-2 border-blue-500">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Wifi className="h-6 w-6 text-blue-500" />
            Servidor Local RetroPedal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  networkInfo.isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                }`}
              />
              <span className="text-sm font-medium">{networkInfo.connectionStatus}</span>
            </div>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Información del Servidor
            </h3>
            <div className="space-y-1 text-sm">
              <p>
                <strong>IP Local:</strong> {networkInfo.localIP}
              </p>
              <p>
                <strong>Puerto:</strong> {networkInfo.port}
              </p>
              <p>
                <strong>URL del Juego:</strong>
                <code className="bg-white px-2 py-1 rounded ml-2">{gameUrl}</code>
              </p>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold mb-2 flex items-center gap-2 text-blue-700">
              <Smartphone className="h-4 w-4" />
              Instrucciones para Dispositivos Móviles
            </h3>
            <ol className="text-sm space-y-1 text-blue-800">
              <li>1. Asegúrate de que tu dispositivo móvil esté en la misma red WiFi</li>
              <li>2. Abre el navegador en tu móvil</li>
              <li>3. Ingresa la siguiente URL:</li>
            </ol>
            <div className="mt-2 flex items-center gap-2">
              <code className="bg-white px-3 py-2 rounded border flex-1 text-center font-mono">{gameUrl}</code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(gameUrl)}
                className="flex items-center gap-1"
              >
                {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "¡Copiado!" : "Copiar"}
              </Button>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h3 className="font-semibold mb-2 text-yellow-700">⚠️ Requisitos Importantes</h3>
            <ul className="text-sm space-y-1 text-yellow-800">
              <li>• Tu computadora y dispositivo móvil deben estar en la misma red WiFi</li>
              <li>• El firewall de tu computadora debe permitir conexiones en el puerto {networkInfo.port}</li>
              <li>• Si no funciona, intenta desactivar temporalmente el firewall</li>
              <li>• En Windows: Permitir la aplicación a través del Firewall de Windows</li>
              <li>• En Mac: Ir a Preferencias del Sistema → Seguridad → Firewall</li>
            </ul>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="font-semibold mb-2 text-green-700">✅ Configuración del Servidor</h3>
            <div className="text-sm space-y-1 text-green-800">
              <p>
                • <strong>Host:</strong> 0.0.0.0 (permite conexiones externas)
              </p>
              <p>
                • <strong>Puerto:</strong> {networkInfo.port}
              </p>
              <p>
                • <strong>Clientes móviles:</strong> Habilitados
              </p>
              <p>
                • <strong>Detección automática de IP:</strong> Activa
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
