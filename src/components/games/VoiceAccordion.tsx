import { useRef, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Volume2, Square } from 'lucide-react'

export interface VoiceOption {
  id: string
  name: string
  description: string
}

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'Puck', name: 'Puck', description: 'Friendly, conversational' },
  { id: 'Charon', name: 'Charon', description: 'Deep, authoritative' },
  { id: 'Kore', name: 'Kore', description: 'Neutral, professional' },
  { id: 'Fenrir', name: 'Fenrir', description: 'Warm, approachable' },
  { id: 'Aoede', name: 'Aoede', description: 'Bright, energetic' },
  { id: 'Leda', name: 'Leda', description: 'Calm, measured' },
  { id: 'Orus', name: 'Orus', description: 'Bold, commanding' },
  { id: 'Zephyr', name: 'Zephyr', description: 'Light, airy' },
]

interface VoiceAccordionProps {
  selectedVoice: string
  onVoiceChange: (voice: string) => void
}

export default function VoiceAccordion({ selectedVoice, onVoiceChange }: VoiceAccordionProps) {
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handlePlayPreview = (voiceId: string) => {
    // Stop current audio if playing
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }

    // If clicking the same voice that's playing, just stop
    if (playingVoice === voiceId) {
      setPlayingVoice(null)
      return
    }

    // Play new voice sample
    const audio = new Audio(`/voices/${voiceId.toLowerCase()}.mp3`)
    audioRef.current = audio

    audio.onended = () => {
      setPlayingVoice(null)
    }

    audio.onerror = () => {
      console.warn(`Voice sample not found: ${voiceId}`)
      setPlayingVoice(null)
    }

    audio.play().then(() => {
      setPlayingVoice(voiceId)
    }).catch((err) => {
      console.warn('Failed to play audio:', err)
      setPlayingVoice(null)
    })
  }

  return (
    <AccordionItem value="voice">
      <AccordionTrigger className="text-base font-semibold">
        Voice
      </AccordionTrigger>
      <AccordionContent>
        <div className="grid gap-4 pt-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Select the AI host voice for this game. Click the speaker icon to preview each voice.
          </p>

          {/* Voice Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {VOICE_OPTIONS.map((voice) => (
              <div
                key={voice.id}
                className={`relative flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  selectedVoice === voice.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
                onClick={() => onVoiceChange(voice.id)}
              >
                {/* Radio indicator */}
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    selectedVoice === voice.id
                      ? 'border-blue-500'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {selectedVoice === voice.id && (
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </div>

                {/* Voice info */}
                <div className="flex-1 min-w-0">
                  <Label className="text-sm font-medium cursor-pointer">
                    {voice.name}
                  </Label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {voice.description}
                  </p>
                </div>

                {/* Play button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePlayPreview(voice.id)
                  }}
                  title={playingVoice === voice.id ? 'Stop preview' : 'Play preview'}
                >
                  {playingVoice === voice.id ? (
                    <Square className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
