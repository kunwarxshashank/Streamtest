"use client"

import { useEffect, useRef } from "react"
import Script from "next/script"

// Define the props interface
interface JWPlayerProps {
  config: any
  onReady?: (player: any) => void
  onError?: (error: any) => void
  onPlay?: () => void
  onPause?: () => void
}

// Define a global type for the JW Player
declare global {
  interface Window {
    jwplayer: any
  }
}

export default function JWPlayer({ config, onReady, onError, onPlay, onPause }: JWPlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null)
  const jwPlayerInstance = useRef<any>(null)
  const uniqueId = useRef(`jwplayer-${Math.random().toString(36).substring(2, 9)}`)

  // Initialize JW Player when the script is loaded
  const initializePlayer = () => {
    if (!playerRef.current || !window.jwplayer) return

    // Create player instance
    jwPlayerInstance.current = window.jwplayer(uniqueId.current)

    // Setup player with config
    const playerConfig = {
      ...config,
      width: "100%",
      aspectratio: "16:9",
      primary: "html5",
      hlshtml: true,
    }

    jwPlayerInstance.current.setup(playerConfig)

    // Add event listeners
    jwPlayerInstance.current.on("ready", () => {
      if (onReady) onReady(jwPlayerInstance.current)
    })

    jwPlayerInstance.current.on("error", (e: any) => {
      console.error("JW Player error:", e)
      if (onError) onError(e)
    })

    jwPlayerInstance.current.on("play", () => {
      if (onPlay) onPlay()
    })

    jwPlayerInstance.current.on("pause", () => {
      if (onPause) onPause()
    })
  }

  // Clean up player on unmount
  useEffect(() => {
    return () => {
      if (jwPlayerInstance.current) {
        jwPlayerInstance.current.remove()
      }
    }
  }, [])

  // Update player config when it changes
  useEffect(() => {
    if (jwPlayerInstance.current && config) {
      jwPlayerInstance.current.load([config])
    }
  }, [config])

  return (
    <>
      <Script
        src="https://content.jwplatform.com/libraries/IDzF9Zmk.js"
        strategy="afterInteractive"
        onLoad={initializePlayer}
      />
      <div ref={playerRef} className="w-full h-full">
        <div id={uniqueId.current} className="w-full h-full"></div>
      </div>
    </>
  )
}

