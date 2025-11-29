import { useState, useEffect } from 'react'
import { Game, CreateGameData, UpdateGameData, GameMetadata } from '@/types/games'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { useToast } from '@/hooks/use-toast'
import { gamesService } from '@/lib/games'
import TimersAccordion from './TimersAccordion'
import VoiceAccordion from './VoiceAccordion'

interface GameEditModalProps {
  game: Game | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: UpdateGameData | CreateGameData & { rounds?: number; questionsPerRound?: number; minLevel?: number; maxLevel?: number }) => Promise<void>
  onDelete?: () => Promise<void>
  isLoading?: boolean
}

export default function GameEditModal({ game, isOpen, onClose, onSave, onDelete, isLoading = false }: GameEditModalProps) {
  const isEdit = !!game
  const { toast } = useToast()
  const [formData, setFormData] = useState<UpdateGameData | CreateGameData & {
    rounds?: number;
    questionsPerRound?: number;
    minLevel?: number;
    maxLevel?: number;
    question_timer?: number | null;
    answer_timer?: number | null;
    game_start_timer?: number | null;
    round_start_timer?: number | null;
    round_end_timer?: number | null;
    game_end_timer?: number | null;
    thanks_timer?: number | null;
    auto_reveal_on_all_answered?: boolean;
    ai_voice?: string;
    ai_personality?: string;
  }>({
    name: '',
    startdate: '',
    duration: 120,
    location: '',
    rounds: 3,
    questionsPerRound: 10,
    minLevel: 1,
    maxLevel: 9,
    question_timer: null,
    answer_timer: null,
    game_start_timer: null,
    round_start_timer: null,
    round_end_timer: null,
    game_end_timer: null,
    thanks_timer: null,
    auto_reveal_on_all_answered: false,
    ai_voice: 'Kore',
    ai_personality: 'classic'
  })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const durationOptions = [0, 30, 60, 90, 120, 150, 180, 240]

  useEffect(() => {
    if (game) {
      setFormData({
        name: game.name || '',
        startdate: game.startdate ? new Date(game.startdate).toISOString().slice(0, 16) : '',
        duration: game.duration || 120,
        location: game.location || '',
        rounds: 3,
        questionsPerRound: 10,
        minLevel: 1,
        maxLevel: 9,
        question_timer: game.metadata?.question_timer || null,
        answer_timer: game.metadata?.answer_timer || null,
        game_start_timer: game.metadata?.game_start_timer || null,
        round_start_timer: game.metadata?.round_start_timer || null,
        round_end_timer: game.metadata?.round_end_timer || null,
        game_end_timer: game.metadata?.game_end_timer || null,
        thanks_timer: game.metadata?.thanks_timer || null,
        auto_reveal_on_all_answered: game.metadata?.auto_reveal_on_all_answered ?? false,
        ai_voice: game.metadata?.ai_voice || 'Kore',
        ai_personality: game.metadata?.ai_personality || 'classic'
      })
    } else {
      // Calculate smart default start date/time
      const now = new Date()
      const currentHour = now.getHours()

      // If before 6 PM, use today at 6 PM, otherwise use tomorrow at 6 PM
      const defaultDate = new Date()
      if (currentHour >= 18) {
        // After 6 PM - set to tomorrow
        defaultDate.setDate(defaultDate.getDate() + 1)
      }
      // Set time to 6:00 PM (18:00)
      defaultDate.setHours(18, 0, 0, 0)

      // Format as datetime-local string (YYYY-MM-DDTHH:MM) in local time
      const year = defaultDate.getFullYear()
      const month = String(defaultDate.getMonth() + 1).padStart(2, '0')
      const day = String(defaultDate.getDate()).padStart(2, '0')
      const hours = String(defaultDate.getHours()).padStart(2, '0')
      const minutes = String(defaultDate.getMinutes()).padStart(2, '0')
      const defaultStartDate = `${year}-${month}-${day}T${hours}:${minutes}`

      // Reset form for create mode with defaults
      setFormData({
        name: '',
        startdate: defaultStartDate,
        duration: 120,
        location: '',
        rounds: 3,
        questionsPerRound: 10,
        minLevel: 1,
        maxLevel: 9,
        question_timer: null,
        answer_timer: null,
        game_start_timer: null,
        round_start_timer: null,
        round_end_timer: null,
        game_end_timer: null,
        thanks_timer: null,
        auto_reveal_on_all_answered: false,
        ai_voice: 'Kore',
        ai_personality: 'classic'
      })
    }
  }, [game])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Convert empty/zero values to null for timers
    const metadata: GameMetadata = {
      question_timer: ('question_timer' in formData ? formData.question_timer : null) || null,
      answer_timer: ('answer_timer' in formData ? formData.answer_timer : null) || null,
      game_start_timer: ('game_start_timer' in formData ? formData.game_start_timer : null) || null,
      round_start_timer: ('round_start_timer' in formData ? formData.round_start_timer : null) || null,
      round_end_timer: ('round_end_timer' in formData ? formData.round_end_timer : null) || null,
      game_end_timer: ('game_end_timer' in formData ? formData.game_end_timer : null) || null,
      thanks_timer: ('thanks_timer' in formData ? formData.thanks_timer : null) || null,
      auto_reveal_on_all_answered: ('auto_reveal_on_all_answered' in formData ? formData.auto_reveal_on_all_answered : false),
      ai_voice: ('ai_voice' in formData ? formData.ai_voice : 'Kore') || 'Kore',
      ai_personality: ('ai_personality' in formData ? formData.ai_personality : 'classic') || 'classic'
    }

    const submitData = {
      ...formData,
      metadata,
      startdate: formData.startdate ? new Date(formData.startdate).toISOString() : undefined
    }

    await onSave(submitData)
    onClose()
  }

  const handleInputChange = (
    field: keyof (UpdateGameData | CreateGameData) | 'rounds' | 'questionsPerRound' | 'minLevel' | 'maxLevel' |
           'question_timer' | 'answer_timer' | 'game_start_timer' | 'round_start_timer' | 'round_end_timer' | 'game_end_timer' | 'thanks_timer' |
           'auto_reveal_on_all_answered',
    value: string | number | null | undefined | boolean
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    if (onDelete) {
      await onDelete()
      setShowDeleteConfirm(false)
      onClose()
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
  }

  const handleCopyTimersFromPreviousGame = async () => {
    try {
      // Fetch recent games
      const games = await gamesService.getGames()

      // Filter games that have timer metadata
      const gamesWithTimers = games.filter(g =>
        g.metadata?.question_timer !== undefined ||
        g.metadata?.answer_timer !== undefined ||
        g.metadata?.game_start_timer !== undefined ||
        g.metadata?.round_start_timer !== undefined ||
        g.metadata?.round_end_timer !== undefined ||
        g.metadata?.game_end_timer !== undefined ||
        g.metadata?.thanks_timer !== undefined
      )

      if (gamesWithTimers.length === 0) {
        toast({
          title: "No Previous Timers",
          description: "No previous games with timer configuration found.",
          variant: "destructive"
        })
        return
      }

      // Explicitly get the most recent by sorting by updated timestamp
      const previousGameWithTimers = gamesWithTimers.sort((a, b) =>
        new Date(b.updated).getTime() - new Date(a.updated).getTime()
      )[0]

      // Copy timer values to form
      setFormData(prev => ({
        ...prev,
        question_timer: previousGameWithTimers.metadata?.question_timer || null,
        answer_timer: previousGameWithTimers.metadata?.answer_timer || null,
        game_start_timer: previousGameWithTimers.metadata?.game_start_timer || null,
        round_start_timer: previousGameWithTimers.metadata?.round_start_timer || null,
        round_end_timer: previousGameWithTimers.metadata?.round_end_timer || null,
        game_end_timer: previousGameWithTimers.metadata?.game_end_timer || null,
        thanks_timer: previousGameWithTimers.metadata?.thanks_timer || null,
        auto_reveal_on_all_answered: previousGameWithTimers.metadata?.auto_reveal_on_all_answered ?? false
      }))

      toast({
        title: "Timers Copied",
        description: `Copied timer settings from "${previousGameWithTimers.name}"`,
      })
    } catch (error) {
      console.error('Failed to copy timers:', error)
      toast({
        title: "Error",
        description: "Failed to load previous game timers.",
        variant: "destructive"
      })
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Game' : 'Create Game'}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Make changes to game information here. Click save when you\'re done.'
                : 'Create a new trivia game. Fill in the details below.'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
            <div className="overflow-y-auto px-6 py-4">
              <Accordion type="single" collapsible defaultValue="basic-info" className="w-full">
                {/* Basic Info Section */}
                <AccordionItem value="basic-info">
                  <AccordionTrigger className="text-base font-semibold">
                    Basic Game Info
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-4 pt-4">
                      {/* Name */}
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                          Name
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className="col-span-3"
                          required
                        />
                      </div>

                      {/* Duration and Location on same line */}
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="duration" className="text-right">
                          Duration
                        </Label>
                        <div className="col-span-3 flex gap-2">
                          <Select
                            value={formData.duration?.toString() || '120'}
                            onValueChange={(value) => handleInputChange('duration', parseInt(value))}
                          >
                            <SelectTrigger className="flex-1 bg-white dark:bg-slate-800 border-input">
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-800 border border-input">
                              {durationOptions.map((minutes) => (
                                <SelectItem key={minutes} value={minutes.toString()}>
                                  {minutes === 0 ? 'No limit' : `${minutes} minutes`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center px-2 text-slate-500">/</div>
                          <Input
                            id="location"
                            value={formData.location}
                            onChange={(e) => handleInputChange('location', e.target.value)}
                            placeholder="Location"
                            className="flex-1"
                          />
                        </div>
                      </div>

                      {/* Start Date */}
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="startdate" className="text-right">
                          Start Date
                        </Label>
                        <Input
                          id="startdate"
                          type="datetime-local"
                          value={formData.startdate}
                          onChange={(e) => handleInputChange('startdate', e.target.value)}
                          className="col-span-3"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Game Structure Section - Create mode only */}
                {!isEdit && (
                  <AccordionItem value="game-structure">
                    <AccordionTrigger className="text-base font-semibold">
                      Game Structure
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-4 pt-4">
                        {/* Rounds and Questions */}
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="rounds" className="text-right">
                            Rounds
                          </Label>
                          <div className="col-span-3 flex gap-4 items-center">
                            <Input
                              id="rounds"
                              type="number"
                              min="0"
                              max="99"
                              value={formData.rounds || 3}
                              onChange={(e) => handleInputChange('rounds', parseInt(e.target.value) || 3)}
                              className="w-16 text-center"
                              required
                            />
                            <Label htmlFor="questionsPerRound" className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              Questions
                            </Label>
                            <Input
                              id="questionsPerRound"
                              type="number"
                              min="1"
                              max="99"
                              value={formData.questionsPerRound || 10}
                              onChange={(e) => handleInputChange('questionsPerRound', parseInt(e.target.value) || 10)}
                              className="w-16 text-center"
                              placeholder="per round"
                              required
                            />
                          </div>
                        </div>

                        {/* Difficulty Level Range */}
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="minLevel" className="text-right">
                            Level
                          </Label>
                          <div className="col-span-3 flex gap-4 items-center">
                            <Input
                              id="minLevel"
                              type="number"
                              min="1"
                              max="9"
                              value={'minLevel' in formData ? formData.minLevel : 1}
                              onChange={(e) => handleInputChange('minLevel', parseInt(e.target.value) || 1)}
                              className="w-16 text-center"
                            />
                            <Label className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              to
                            </Label>
                            <Input
                              id="maxLevel"
                              type="number"
                              min="1"
                              max="9"
                              value={'maxLevel' in formData ? formData.maxLevel : 9}
                              onChange={(e) => handleInputChange('maxLevel', parseInt(e.target.value) || 9)}
                              className="w-16 text-center"
                            />
                          </div>
                        </div>

                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Timers Section */}
                <TimersAccordion
                  timers={{
                    question_timer: 'question_timer' in formData ? formData.question_timer : null,
                    answer_timer: 'answer_timer' in formData ? formData.answer_timer : null,
                    game_start_timer: 'game_start_timer' in formData ? formData.game_start_timer : null,
                    round_start_timer: 'round_start_timer' in formData ? formData.round_start_timer : null,
                    round_end_timer: 'round_end_timer' in formData ? formData.round_end_timer : null,
                    game_end_timer: 'game_end_timer' in formData ? formData.game_end_timer : null,
                    thanks_timer: 'thanks_timer' in formData ? formData.thanks_timer : null,
                    auto_reveal_on_all_answered: 'auto_reveal_on_all_answered' in formData ? formData.auto_reveal_on_all_answered : false
                  }}
                  onTimersChange={(timers) => {
                    setFormData(prev => ({ ...prev, ...timers }))
                  }}
                  onCopyFromPrevious={handleCopyTimersFromPreviousGame}
                />

                {/* AI Host Section */}
                <VoiceAccordion
                  selectedVoice={'ai_voice' in formData ? formData.ai_voice || 'Kore' : 'Kore'}
                  onVoiceChange={(voice) => {
                    setFormData(prev => ({ ...prev, ai_voice: voice }))
                  }}
                  selectedPersonality={'ai_personality' in formData ? formData.ai_personality || 'classic' : 'classic'}
                  onPersonalityChange={(personality) => {
                    setFormData(prev => ({ ...prev, ai_personality: personality }))
                  }}
                />
              </Accordion>
            </div>
            <DialogFooter>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 w-full">
                <div className="flex flex-col-reverse sm:flex-row sm:justify-start sm:space-x-2">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Game')}
                  </Button>
                </div>
                {isEdit && onDelete && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDeleteClick}
                    disabled={isLoading}
                    className="sm:ml-auto"
                  >
                    Delete Game
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Game</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the game "{formData.name}"? This action cannot be undone and will also delete all rounds associated with this game.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              This will permanently delete the game and all its rounds. This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleDeleteCancel}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteConfirm}>
              Delete Game
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}