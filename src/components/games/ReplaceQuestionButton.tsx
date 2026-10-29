import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { gameQuestionsService, type GameQuestion } from '@/lib/gameQuestions'
import { questionsService, type Question } from '@/lib/questions'

export default function ReplaceQuestionButton({ gameQuestion, question, onReplaced }: {
  gameQuestion: GameQuestion
  question: Question
  onReplaced: (record: GameQuestion, question: Question) => void
}) {
  const [open, setOpen] = useState(false)
  const [levels, setLevels] = useState<number[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setLevels([])
    setSelected([])
    setError('')
    const load = async () => {
      try {
        const available = await questionsService.getDifficultyLevels()
        if (cancelled) return
        setLevels(available)
        const currentLevel = question.level === '' || question.level == null ? NaN : Number(question.level)
        setSelected(available.includes(currentLevel) ? [currentLevel] : [])
        if (!available.length) setError('No questions are available to replace this question.')
      } catch {
        if (!cancelled) setError('Unable to load difficulty levels. Please retry.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [open, question.level, retry])

  const replace = async () => {
    if (loading || replacing || !selected.length) return
    setReplacing(true)
    setError('')
    try {
      const result = await gameQuestionsService.replaceGameQuestion(gameQuestion, selected)
      setOpen(false)
      onReplaced(result.record, result.question)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to replace question. Please try again.')
    } finally {
      setReplacing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={value => { if (!replacing) setOpen(value) }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" title="Replace with a new question" aria-label="Replace with a new question">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-lg p-4 md:p-6" aria-busy={replacing}>
        <DialogHeader className="pr-6">
          <DialogTitle>Replace question?</DialogTitle>
          <DialogDescription>Select one or more difficulty levels. A new question will be chosen randomly from those levels.</DialogDescription>
        </DialogHeader>
        <CardDescription className="break-words">{question.question}</CardDescription>
        <CardDescription className="font-medium">Difficulty levels</CardDescription>
        {loading ? (
          <CardDescription role="status">Loading difficulty levels…</CardDescription>
        ) : (
          <Card role="group" aria-label="Difficulty levels" className="grid grid-cols-5 gap-2 border-0 shadow-none">
            {levels.map(level => (
              <Button
                key={level}
                variant={selected.includes(level) ? 'default' : 'outline'}
                className="min-h-[44px] px-1"
                aria-label={`Level ${level}`}
                aria-pressed={selected.includes(level)}
                disabled={replacing}
                onClick={() => setSelected(previous => previous.includes(level) ? previous.filter(value => value !== level) : [...previous, level])}
              >
                {level}
              </Button>
            ))}
          </Card>
        )}
        {error && <CardDescription role="alert">{error}</CardDescription>}
        {!loading && error && !levels.length && (
          <Button variant="outline" className="min-h-[44px]" onClick={() => setRetry(value => value + 1)}>Retry</Button>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" className="min-h-[44px]" disabled={replacing} onClick={() => setOpen(false)}>Cancel</Button>
          <Button className="min-h-[44px]" disabled={loading || replacing || !selected.length} onClick={() => void replace()}>
            {replacing ? 'Replacing…' : 'Replace Question'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
