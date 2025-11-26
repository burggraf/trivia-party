import { useRef, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Volume2, Square } from 'lucide-react'

export interface VoiceOption {
  id: string        // Gemini API voice ID
  name: string      // Display name
  description: string
}

export interface PersonalityOption {
  id: string
  name: string
  description: string
}

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'Puck', name: 'Ethan', description: 'Friendly, conversational' },
  { id: 'Charon', name: 'Logan', description: 'Deep, authoritative' },
  { id: 'Kore', name: 'Ava', description: 'Neutral, professional' },
  { id: 'Fenrir', name: 'Noah', description: 'Warm, approachable' },
  { id: 'Aoede', name: 'Olivia', description: 'Bright, energetic' },
  { id: 'Leda', name: 'Sophia', description: 'Calm, measured' },
  { id: 'Orus', name: 'Liam', description: 'Bold, commanding' },
  { id: 'Zephyr', name: 'Mia', description: 'Light, airy' },
]

export const PERSONALITY_OPTIONS: PersonalityOption[] = [
  { id: 'classic', name: 'Classic', description: 'Warm, professional game show host' },
  { id: 'hype', name: 'Hype', description: 'Maximum energy, everything is AMAZING' },
  { id: 'dry', name: 'Dry', description: 'Flat, deadpan, almost bored delivery' },
  { id: 'roast', name: 'Roast', description: 'Playful teasing, mock disappointment' },
]

interface VoiceAccordionProps {
  selectedVoice: string
  onVoiceChange: (voice: string) => void
  selectedPersonality: string
  onPersonalityChange: (personality: string) => void
}

export default function VoiceAccordion({
  selectedVoice,
  onVoiceChange,
  selectedPersonality,
  onPersonalityChange
}: VoiceAccordionProps) {
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

    // Play new voice sample - use display name for file
    const voice = VOICE_OPTIONS.find(v => v.id === voiceId)
    const fileName = voice?.name.toLowerCase() || voiceId.toLowerCase()
    const audio = new Audio(`/voices/${fileName}.mp3`)
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
        AI Host
      </AccordionTrigger>
      <AccordionContent>
        <div className="grid gap-6 pt-4">
          {/* Voice Selection */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Voice</Label>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Click the speaker icon to preview each voice.
            </p>
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

          {/* Personality Selection */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Personality</Label>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Choose the host's temperament and style.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PERSONALITY_OPTIONS.map((personality) => (
                <div
                  key={personality.id}
                  className={`relative flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedPersonality === personality.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                  onClick={() => onPersonalityChange(personality.id)}
                >
                  {/* Radio indicator */}
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedPersonality === personality.id
                        ? 'border-blue-500'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {selectedPersonality === personality.id && (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>

                  {/* Personality info */}
                  <div className="flex-1 min-w-0">
                    <Label className="text-sm font-medium cursor-pointer">
                      {personality.name}
                    </Label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {personality.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
