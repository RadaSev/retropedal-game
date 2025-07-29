"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import NetworkInfo from "../network-info"
import RetroPedalGame from "../components/retropedal-game"

export default function Page() {
  const [showGame, setShowGame] = useState(false)

  if (showGame) {
    return <RetroPedalGame />
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">🚴 RetroPedal - Servidor Local</h1>
          <p className="text-gray-300 mb-6">
            Configura tu servidor local para jugar RetroPedal desde cualquier dispositivo móvil en tu red
          </p>
        </div>

        <NetworkInfo />

        <div className="text-center mt-8">
          <Button onClick={() => setShowGame(true)} size="lg" className="bg-blue-600 hover:bg-blue-700">
            🎮 Jugar RetroPedal
          </Button>
        </div>

        <div className="mt-8 bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold text-white mb-4">📋 Pasos para Configurar</h2>
          <div className="space-y-4 text-gray-300">
            <div className="flex items-start gap-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                1
              </span>
              <div>
                <h3 className="font-semibold">Ejecutar el servidor</h3>
                <p className="text-sm">
                  Ejecuta <code className="bg-gray-700 px-2 py-1 rounded">npm run dev -- --host 0.0.0.0</code> en tu
                  terminal
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                2
              </span>
              <div>
                <h3 className="font-semibold">Configurar firewall</h3>
                <p className="text-sm">Permite conexiones entrantes en el puerto 3000 en tu firewall</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                3
              </span>
              <div>
                <h3 className="font-semibold">Conectar dispositivos</h3>
                <p className="text-sm">Usa la URL mostrada arriba para conectar tus dispositivos móviles</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
