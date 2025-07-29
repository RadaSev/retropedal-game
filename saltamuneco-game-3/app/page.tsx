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

        {/* RetroPedalGame component is now conditionally rendered */}
      </div>
    </div>
  )
}
