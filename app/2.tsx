"use client"

import { useState, useRef, useEffect } from "react"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Settings,
  Link,
  Copy,
  Check,
  Code,
  Maximize,
  Minimize,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import JWPlayer from "@/components/jw-player"

export default function NetworkStreamPlayer() {
  const [url, setUrl] = useState("")
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [drmType, setDrmType] = useState("none")
  const [clearKeyData, setClearKeyData] = useState("")
  const [widevineData, setWidevineData] = useState("")
  const [error, setError] = useState("")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [embedType, setEmbedType] = useState("iframe")
  const [copied, setCopied] = useState(false)
  const [videoFormat, setVideoFormat] = useState("auto")
  const [isLoading, setIsLoading] = useState(false)
  const [playerConfig, setPlayerConfig] = useState<any>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const embedCodeRef = useRef<HTMLTextAreaElement>(null)
  const jwPlayerRef = useRef<any>(null)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const streamUrl = urlParams.get("url");
    const drmTypeParam = urlParams.get("drmtype");
    const drmValueParam = urlParams.get("drmvalue");

    if (streamUrl) {
      setUrl(streamUrl);
      if (drmTypeParam) {
        setDrmType(drmTypeParam);
        if (drmTypeParam === "clearkey" && drmValueParam) {
          setClearKeyData(drmValueParam);
        } else if (drmTypeParam === "widevine" && drmValueParam) {
          setWidevineData(drmValueParam);
        }
      }
      handlePlay();
    }
  }, []);








  const handlePlay = async () => {
    if (!url) {
      setError("Please enter a valid stream URL");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      // Configure JW Player
      const config: any = {
        file: url,
        autostart: true,
      };

      // Add DRM configuration if needed
      if (drmType === "clearkey" && clearKeyData) {

        try {
          let clearKeyJson;
          // Check if the clearKeyData is already in JSON format
          if (clearKeyData.includes("kid")) {
            clearKeyJson = JSON.parse(clearKeyData);

            const { keys } = clearKeyJson;
            if (keys && keys.length > 0) {
              const { kid, k } = keys[0];

              // Convert base64 to hex
              const kidHex = Buffer.from(kid, "base64").toString("hex");
              const keyHex = Buffer.from(k, "base64").toString("hex");

              console.log("kid (hex): ", kidHex);
              console.log("key (hex): ", keyHex);

              config.drm = {
                clearkey: {
                  keyId: kidHex,
                  key: keyHex,
                },
              };
            }
          } else {
            const keyParts = clearKeyData.split(":");
            const kid = keyParts[0];
            const key = keyParts[1];
            console.log("kid: ", kid);
            console.log("key: ", key);
            config.drm = {
              clearkey: {
                keyId: kid,
                key: key,
              },
            };
          }
          console.log("clearkey: ", clearKeyJson);
        } catch (e) {
          setError("Invalid ClearKey JSON format");
          setIsLoading(false);
          return;
        }
      } else if (drmType === "widevine" && widevineData) {
        config.drm = {
          widevine: {
            url: widevineData,
          },
        };
      }

      setPlayerConfig(config);
      setIsPlaying(true);
    } catch (err) {
      console.error("Error setting up player:", err);
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlay = () => {
    if (jwPlayerRef.current) {
      if (isPlaying) {
        jwPlayerRef.current.pause();
      } else {
        jwPlayerRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (jwPlayerRef.current) {
      jwPlayerRef.current.setMute(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;

    if (!isFullscreen) {
      if (playerContainerRef.current.requestFullscreen) {
        playerContainerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };


  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  const testStreamUrl = async () => {
    if (!url) {
      setError("Please enter a URL to test")
      return
    }

    setError("")
    setIsLoading(true)

    try {
      // Simple fetch to check if the URL is accessible
      const response = await fetch(url, { method: "HEAD" })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      toast({
        title: "Stream test successful",
        description: "The URL appears to be accessible",
      })
    } catch (err) {
      console.error("Stream test failed:", err)
      setError(`Stream test failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsLoading(false)
    }
  }

  const getEmbedCode = () => {
    if (!url) return ""

    const drmParams =
      drmType !== "none"
        ? `&drm=${drmType}${drmType === "clearkey" ? `&clearkey=${encodeURIComponent(clearKeyData)}` : ""}${drmType === "widevine" ? `&widevine=${encodeURIComponent(widevineData)}` : ""}`
        : ""

    switch (embedType) {
      case "iframe":
        return `<iframe src="https://yoursite.com/embed?url=${encodeURIComponent(url)}${drmParams}" width="640" height="360" frameborder="0" allowfullscreen></iframe>`
      case "direct":
        return url
      case "html":
        return `<script src="https://cdn.jwplayer.com/libraries/YOUR_JW_PLAYER_KEY.js"><\/script>
<div id="player"></div>
<script>
  jwplayer("player").setup({
    file: "${url}",
    autostart: true,
    mute: false,
    width: "100%",
    aspectratio: "16:9"
  });
<\/script>`
      case "json":
        return JSON.stringify(
          {
            url,
            drmType,
            videoFormat,
            ...(drmType === "clearkey" && { clearKeyData }),
            ...(drmType === "widevine" && { widevineData }),
          },
          null,
          2,
        )
      default:
        return ""
    }
  }

  const copyEmbedCode = () => {
    const code = getEmbedCode()
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true)
        toast({
          title: "Copied!",
          description: "Embed code copied to clipboard",
        })
        setTimeout(() => setCopied(false), 2000)
      })
      .catch((err) => {
        console.error("Failed to copy:", err)
        toast({
          title: "Copy failed",
          description: "Please try again or copy manually",
          variant: "destructive",
        })
      })
  }

  const handlePlayerReady = (player: any) => {
    jwPlayerRef.current = player
    setIsLoading(false)
    
  }

  const handlePlayerError = (error: any) => {
    console.error("JW Player error:", error)
    setError(`Playback error: ${error.message || "Unknown error"}`)
    setIsLoading(false)
    setIsPlaying(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-2 sm:p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-4 md:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            Network Stream
          </h1>
          <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">Test your streams anytime anywhere with DRM support</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2">
            <div
              ref={playerContainerRef}
              className="relative bg-black rounded-lg overflow-hidden aspect-video shadow-xl"
            >
              {playerConfig ? (
                <JWPlayer
                  config={playerConfig}
                  onReady={handlePlayerReady}
                  onError={handlePlayerError}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center p-4 sm:p-6">
                    <Link className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-2 sm:mb-4 text-gray-500" />
                    <p className="text-gray-500 text-sm sm:text-base">Enter a stream URL and press Play</p>
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
                    <p className="mt-4 text-white">Loading stream...</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-2 sm:mt-4 p-2 sm:p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200 text-sm flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div>{error}</div>
                </div>
              )}
            </div>

            <div className="mt-4 lg:mt-6 hidden lg:block">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2 sm:pb-4">
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                    <Code className="h-4 w-4 sm:h-5 sm:w-5" />
                    Embed Code
                  </CardTitle>
                  <CardDescription className="text-gray-400 text-xs sm:text-sm">
                    Share your stream with others
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 sm:space-y-4 pt-0">
                  <RadioGroup value={embedType} onValueChange={setEmbedType} className="flex flex-wrap gap-2 sm:gap-3">
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="iframe" id="iframe" className="h-3 w-3 sm:h-4 sm:w-4" />
                      <Label htmlFor="iframe" className="text-xs sm:text-sm">
                        iFrame
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="direct" id="direct" className="h-3 w-3 sm:h-4 sm:w-4" />
                      <Label htmlFor="direct" className="text-xs sm:text-sm">
                        Direct URL
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="html" id="html" className="h-3 w-3 sm:h-4 sm:w-4" />
                      <Label htmlFor="html" className="text-xs sm:text-sm">
                        HTML
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="json" id="json" className="h-3 w-3 sm:h-4 sm:w-4" />
                      <Label htmlFor="json" className="text-xs sm:text-sm">
                        JSON
                      </Label>
                    </div>
                  </RadioGroup>

                  <div className="space-y-1 sm:space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="embed-code" className="text-sm">
                        Code
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyEmbedCode}
                        className="h-6 px-2 text-xs flex items-center gap-1"
                        disabled={!url}
                      >
                        {copied ? (
                          <>
                            <Check className="h-3 w-3" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <Textarea
                      id="embed-code"
                      ref={embedCodeRef}
                      value={getEmbedCode()}
                      readOnly
                      className="bg-gray-900 border-gray-700 min-h-[80px] sm:min-h-[100px] text-xs font-mono"
                      placeholder={url ? "" : "Enter a stream URL first"}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-lg sm:text-xl">Stream Settings</CardTitle>
                <CardDescription className="text-gray-400 text-xs sm:text-sm">
                  Configure your stream and DRM options
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 sm:space-y-4 pt-0">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="url" className="text-sm">
                    Stream URL
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="url"
                      placeholder="https://example.com/stream.m3u8"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="bg-gray-900 border-gray-700 text-sm"
                    />
                    <Button onClick={handlePlay} size="sm" className="whitespace-nowrap" disabled={isLoading}>
                      {isLoading ? "Loading..." : "Play"}
                    </Button>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={testStreamUrl}
                      className="text-xs mt-1"
                      disabled={isLoading || !url}
                    >
                      Test URL
                    </Button>
                  </div>
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="format" className="text-sm">
                    Video Format
                  </Label>
                  <Select value={videoFormat} onValueChange={setVideoFormat}>
                    <SelectTrigger className="bg-gray-900 border-gray-700">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-detect</SelectItem>
                      <SelectItem value="hls">HLS (m3u8)</SelectItem>
                      <SelectItem value="dash">DASH (mpd)</SelectItem>
                      <SelectItem value="mp4">MP4</SelectItem>
                      <SelectItem value="direct">Direct (as-is)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Tabs defaultValue="none" onValueChange={setDrmType}>
                  <Label className="text-sm">DRM Protection</Label>
                  <TabsList className="grid grid-cols-3 mt-1 sm:mt-2 bg-gray-900">
                    <TabsTrigger value="none" className="text-xs sm:text-sm">
                      None
                    </TabsTrigger>
                    <TabsTrigger value="clearkey" className="text-xs sm:text-sm">
                      ClearKey
                    </TabsTrigger>
                    <TabsTrigger value="widevine" className="text-xs sm:text-sm">
                      Widevine
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="none">
                    <p className="text-xs sm:text-sm text-gray-400 mt-1 sm:mt-2">
                      No DRM protection will be applied to the stream.
                    </p>
                  </TabsContent>

                  <TabsContent value="clearkey" className="space-y-1 sm:space-y-2">
                    <Label htmlFor="clearkey" className="text-sm">
                      ClearKey JSON
                    </Label>
                    <Textarea
                      id="clearkey"
                      placeholder='e1e1fa75dadfdd82184aa2f1dd97af42:37f1b4f7507a6e89ebf2b8f4486d497e'
                      value={clearKeyData}
                      onChange={(e) => setClearKeyData(e.target.value)}
                      className="bg-gray-900 border-gray-700 min-h-[80px] sm:min-h-[100px] text-xs sm:text-sm"
                    />
                  </TabsContent>

                  <TabsContent value="widevine" className="space-y-1 sm:space-y-2">
                    <Label htmlFor="widevine" className="text-sm">
                      Widevine License URL
                    </Label>
                    <Input
                      id="widevine"
                      placeholder="https://license.example.com/widevine"
                      value={widevineData}
                      onChange={(e) => setWidevineData(e.target.value)}
                      className="bg-gray-900 border-gray-700 text-xs sm:text-sm"
                    />
                  </TabsContent>
                </Tabs>

                <div className="flex items-center space-x-2 pt-1 sm:pt-2">
                  <Switch id="auto-play" />
                  <Label htmlFor="auto-play" className="text-xs sm:text-sm">
                    Auto-play when URL changes
                  </Label>
                </div>
              </CardContent>

              <CardFooter className="border-t border-gray-700 pt-2 sm:pt-4">
                <p className="text-xs text-gray-400">
                  Supports HLS, DASH, and MP4 streams with optional DRM protection.
                </p>
              </CardFooter>
            </Card>

            <div className="lg:hidden">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2 sm:pb-4">
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                    <Code className="h-4 w-4 sm:h-5 sm:w-5" />
                    Embed Code
                  </CardTitle>
                  <CardDescription className="text-gray-400 text-xs sm:text-sm">
                    Share your stream with others
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 sm:space-y-4 pt-0">
                  <RadioGroup value={embedType} onValueChange={setEmbedType} className="flex flex-wrap gap-2 sm:gap-3">
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="iframe" id="iframe" className="h-3 w-3 sm:h-4 sm:w-4" />
                      <Label htmlFor="iframe" className="text-xs sm:text-sm">
                        iFrame
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="direct" id="direct" className="h-3 w-3 sm:h-4 sm:w-4" />
                      <Label htmlFor="direct" className="text-xs sm:text-sm">
                        Direct URL
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="html" id="html" className="h-3 w-3 sm:h-4 sm:w-4" />
                      <Label htmlFor="html" className="text-xs sm:text-sm">
                        HTML
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="json" id="json" className="h-3 w-3 sm:h-4 sm:w-4" />
                      <Label htmlFor="json" className="text-xs sm:text-sm">
                        JSON
                      </Label>
                    </div>
                  </RadioGroup>

                  <div className="space-y-1 sm:space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="embed-code" className="text-sm">
                        Code
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyEmbedCode}
                        className="h-6 px-2 text-xs flex items-center gap-1"
                        disabled={!url}
                      >
                        {copied ? (
                          <>
                            <Check className="h-3 w-3" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <Textarea
                      id="embed-code"
                      ref={embedCodeRef}
                      value={getEmbedCode()}
                      readOnly
                      className="bg-gray-900 border-gray-700 min-h-[80px] sm:min-h-[100px] text-xs font-mono"
                      placeholder={url ? "" : "Enter a stream URL first"}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

