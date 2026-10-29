import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Check, Pause, Play, TimerReset } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import ControllerHeader from './ControllerHeader'
import ReplaceQuestionButton from './ReplaceQuestionButton'
import type { useControllerSettings } from '@/hooks/useControllerSettings'
import pb from '@/lib/pocketbase'
import { gamesService } from '@/lib/games'
import { roundsService } from '@/lib/rounds'
import type { GameQuestion } from '@/lib/gameQuestions'
import type { Question } from '@/lib/questions'
import { getShuffledAnswers } from '@/lib/answerShuffler'
import type { Game } from '@/types/games'
import type { Round } from '@/types/rounds'

type RoundQuestion = GameQuestion & { expand?: { question: Question } }
type HostQuestion = { id: string; record: GameQuestion; question: Question; answers: ReturnType<typeof getShuffledAnswers> }

export default function HostOnlyController({ settings }: { settings: ReturnType<typeof useControllerSettings> }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [game, setGame] = useState<Game | null>(null)
  const [rounds, setRounds] = useState<Round[]>([])
  const [roundIndex, setRoundIndex] = useState(0)
  const [lastRoundIndex, setLastRoundIndex] = useState(0)
  const [presentedQuestions, setPresentedQuestions] = useState<Record<string, number>>({})
  const [revealedRounds, setRevealedRounds] = useState<Record<string, boolean>>({})
  const [lockedQuestions, setLockedQuestions] = useState<Set<string>>(() => new Set())
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!id) return
      setError('')
      try {
        const [loadedGame, loadedRounds] = await Promise.all([
          gamesService.getGame(id), roundsService.getRounds(id),
        ])
        if (cancelled) return
        if (loadedRounds.length > 0 && loadedGame.status !== 'in-progress') {
          await gamesService.updateGame(id, { status: 'in-progress' })
        }
        if (cancelled) return
        setGame(loadedGame)
        setRounds(loadedRounds.sort((a, b) => a.sequence_number - b.sequence_number))
      } catch {
        if (!cancelled) setError('Unable to load game. Please try again.')
      }
    }
    void load()
    return () => { cancelled = true }
  }, [id, retry])

  const completeGame = async () => {
    if (!id || closing) return
    setClosing(true)
    try {
      await gamesService.updateGame(id, { status: 'completed' })
      navigate('/host')
    } catch {
      toast.error('Unable to complete game. Please try again.')
      setClosing(false)
    }
  }

  const round = rounds[roundIndex]
  const goToRound = (index: number) => {
    setRoundIndex(index)
    window.scrollTo(0, 0)
  }

  return (
    <Card className="min-h-screen rounded-none border-0 bg-slate-50 dark:bg-slate-900">
      <ControllerHeader
        gameName={game?.name || 'Controller'}
        gameCode={game?.code || ''}
        playMode={settings.playMode}
        onPlayModeChange={settings.selectPlayMode}
        showQrCode={settings.showQrCode}
        showJoinLink={settings.showJoinLink}
        onToggleQrCode={settings.toggleQrCode}
        onToggleJoinLink={settings.toggleJoinLink}
        onBack={() => navigate('/host')}
      />
      <CardContent className="max-w-3xl mx-auto p-0 md:px-6 lg:px-8">
        {error ? (
          <Card role="alert">
            <CardHeader><CardDescription>{error}</CardDescription></CardHeader>
            <CardFooter><Button className="min-h-[44px]" onClick={() => setRetry(value => value + 1)}>Retry</Button></CardFooter>
          </Card>
        ) : !game ? (
          <CardDescription role="status">Loading game…</CardDescription>
        ) : round ? (
          <HostOnlyRound
            key={round.id}
            round={round}
            roundNumber={roundIndex + 1}
            roundCount={rounds.length}
            availableRounds={lastRoundIndex + 1}
            availableQuestions={presentedQuestions[round.id] ?? 1}
            answersRevealed={revealedRounds[round.id] ?? false}
            canReplaceQuestion={number => !lockedQuestions.has(`${round.id}:${number}`)}
            onQuestionLeft={number => setLockedQuestions(previous => new Set(previous).add(`${round.id}:${number}`))}
            onRevealAnswers={() => setRevealedRounds(previous => ({ ...previous, [round.id]: true }))}
            onQuestionPresented={number => setPresentedQuestions(previous => ({
              ...previous, [round.id]: Math.max(previous[round.id] ?? 1, number),
            }))}
            onRoundChange={number => { if (number <= lastRoundIndex + 1) goToRound(number - 1) }}
            onNextRound={() => {
              setLastRoundIndex(index => Math.max(index, roundIndex + 1))
              goToRound(roundIndex + 1)
            }}
            onComplete={completeGame}
            closing={closing}
          />
        ) : (
          <CardDescription>No rounds in this game. Add rounds before playing.</CardDescription>
        )}
      </CardContent>
    </Card>
  )
}

function HostOnlyRound({ round, roundNumber, roundCount, availableRounds, availableQuestions, answersRevealed, canReplaceQuestion, onQuestionLeft, onRevealAnswers, onQuestionPresented, onRoundChange, onNextRound, onComplete, closing }: {
  round: Round
  roundNumber: number
  roundCount: number
  availableRounds: number
  availableQuestions: number
  answersRevealed: boolean
  canReplaceQuestion: (number: number) => boolean
  onQuestionLeft: (number: number) => void
  onRevealAnswers: () => void
  onQuestionPresented: (number: number) => void
  onRoundChange: (number: number) => void
  onNextRound: () => void
  onComplete: () => void
  closing: boolean
}) {
  const [questions, setQuestions] = useState<HostQuestion[] | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [showAnswers, setShowAnswers] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setError('')
      try {
        // Expand in one request instead of fetching each question separately.
        const records = await pb.collection('game_questions').getFullList<RoundQuestion>({
          filter: pb.filter('round = {:round} && game = {:game} && host = {:host} && sequence > 0', {
            round: round.id, game: round.game, host: pb.authStore.record?.id,
          }),
          sort: 'sequence',
          expand: 'question',
        })
        const loaded = records.map(record => {
          const question = record.expand?.question
          if (!question) throw new Error('Question is missing or inaccessible')
          return {
            id: record.id,
            record,
            question,
            answers: getShuffledAnswers(record.key, question.answer_a, question.answer_b, question.answer_c, question.answer_d),
          }
        })
        if (!cancelled) setQuestions(loaded)
      } catch {
        if (!cancelled) setError('Unable to load round questions. Please try again.')
      }
    }
    void load()
    return () => { cancelled = true }
  }, [round.id, round.game, retry])

  const question = questions?.[questionIndex]
  const lastQuestion = questions !== null && questionIndex === questions.length - 1
  const canAdvanceRound = showAnswers || questions?.length === 0

  return (
    <Card className="rounded-none border-0 shadow-none md:rounded-lg md:border">
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-lg md:text-2xl break-words text-center">{round.title}</CardTitle>
        <CardDescription className="grid grid-cols-2 gap-4">
          <NumberPicker label="Round" current={roundNumber} total={roundCount} available={availableRounds} onSelect={number => {
            onQuestionLeft(questionIndex + 1)
            onRoundChange(number)
          }} />
          {questions && questions.length > 0 && (
            <NumberPicker
              label="Question"
              current={questionIndex + 1}
              total={questions.length}
              available={availableQuestions}
              onSelect={number => {
                if (number <= availableQuestions) {
                  onQuestionLeft(questionIndex + 1)
                  setShowAnswers(false)
                  setQuestionIndex(number - 1)
                }
              }}
              answers={{
                revealed: answersRevealed,
                showing: showAnswers,
                onSelect: () => {
                  if (answersRevealed) { setShowAnswers(true); window.scrollTo(0, 0) }
                },
              }}
            />
          )}
        </CardDescription>
        {showAnswers && <CardDescription className="text-center">Round Answers</CardDescription>}
      </CardHeader>
      <CardContent className="px-4 md:px-6 space-y-4 md:space-y-6">
        {error ? (
          <Card role="alert" className="p-4 space-y-3">
            <CardDescription>{error}</CardDescription>
            <Button className="min-h-[44px]" onClick={() => setRetry(value => value + 1)}>Retry</Button>
          </Card>
        ) : questions === null ? (
          <CardDescription role="status">Loading questions…</CardDescription>
        ) : questions.length === 0 ? (
          <CardDescription>No questions in this round.</CardDescription>
        ) : showAnswers ? (
          questions.map((item, index) => (
            <QuestionCard key={item.id} item={item} number={index + 1} reveal />
          ))
        ) : question && (
          <QuestionCard item={question} onReplaced={!answersRevealed && canReplaceQuestion(questionIndex + 1) ? (record, replacement) => {
            setQuestions(previous => previous?.map(item => item.id === question.id ? {
              id: record.id,
              record,
              question: replacement,
              answers: getShuffledAnswers(record.key, replacement.answer_a, replacement.answer_b, replacement.answer_c, replacement.answer_d),
            } : item) ?? null)
          } : undefined} />
        )}
      </CardContent>
      {!error && questions && (
        <CardFooter className="px-4 md:px-6 flex flex-wrap gap-3 justify-between">
          {canAdvanceRound ? (
            <Button className="min-h-[44px] mx-auto" disabled={closing} onClick={roundNumber < roundCount ? onNextRound : onComplete}>
              {roundNumber < roundCount ? 'Next Round' : closing ? 'Closing…' : 'Game Complete'}
            </Button>
          ) : (
            <>
              <Button variant="outline" className="min-h-[44px]" disabled={questionIndex === 0} onClick={() => { onQuestionLeft(questionIndex + 1); setQuestionIndex(index => index - 1) }}>
                Previous Question
              </Button>
              {lastQuestion ? (
                <Button className="min-h-[44px]" onClick={() => { onQuestionLeft(questionIndex + 1); onRevealAnswers(); setShowAnswers(true); window.scrollTo(0, 0) }}>Reveal Answers</Button>
              ) : (
                <Button className="min-h-[44px]" onClick={() => {
                  onQuestionLeft(questionIndex + 1)
                  onQuestionPresented(questionIndex + 2)
                  setQuestionIndex(index => index + 1)
                }}>Next Question</Button>
              )}
            </>
          )}
          {!showAnswers && question && <QuestionTimer key={question.id} />}
        </CardFooter>
      )}
    </Card>
  )
}

function QuestionTimer() {
  const [elapsed, setElapsed] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(() => performance.now())
  const [now, setNow] = useState(() => performance.now())

  useEffect(() => {
    if (startedAt === null) return
    const interval = window.setInterval(() => setNow(performance.now()), 250)
    return () => window.clearInterval(interval)
  }, [startedAt])

  const seconds = Math.floor((elapsed + (startedAt === null ? 0 : now - startedAt)) / 1000)

  return (
    <Card role="group" aria-label="Question timer controls" className="grid w-full grid-cols-3 items-center gap-3 rounded-none border-0 shadow-none">
      <Button variant="outline" size="icon" className="h-11 w-11 justify-self-start" aria-label="Reset timer" onClick={() => {
        const current = performance.now()
        setElapsed(0)
        setNow(current)
        if (startedAt !== null) setStartedAt(current)
      }}>
        <TimerReset aria-hidden="true" className="h-4 w-4" />
      </Button>
      <CardDescription role="timer" aria-label="Elapsed question time" className="justify-self-center min-w-[5ch] font-mono text-lg md:text-xl font-semibold tabular-nums text-slate-800 dark:text-slate-100">
        {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
      </CardDescription>
      <Button variant="outline" size="icon" className="h-11 w-11 justify-self-end" aria-label={startedAt === null ? 'Resume timer' : 'Pause timer'} onClick={() => {
        const current = performance.now()
        setNow(current)
        if (startedAt === null) {
          setStartedAt(current)
        } else {
          setElapsed(elapsed + current - startedAt)
          setStartedAt(null)
        }
      }}>
        {startedAt === null ? <Play aria-hidden="true" className="h-4 w-4" /> : <Pause aria-hidden="true" className="h-4 w-4" />}
      </Button>
    </Card>
  )
}

function NumberPicker({ label, current, total, available, onSelect, answers }: {
  label: 'Round' | 'Question'
  current: number
  total: number
  available: number
  onSelect: (number: number) => void
  answers?: { revealed: boolean; showing: boolean; onSelect: () => void }
}) {
  const [open, setOpen] = useState(false)
  const title = `Jump to ${label.toLowerCase()}`

  return (
    <CardDescription className="grid grid-cols-[44px_auto_44px] justify-center items-center gap-x-2 gap-y-1 whitespace-nowrap" aria-live="polite">
      <CardDescription className="col-span-3 text-center font-medium">{label}</CardDescription>{' '}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="h-11 min-w-[44px] px-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700" aria-label={title}>{current}</Button>
        </DialogTrigger>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden rounded-lg p-4 md:p-6">
          <DialogHeader className="pr-6">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Choose a previously presented {label.toLowerCase()}. The current selection is highlighted.
            </DialogDescription>
          </DialogHeader>
          <Card role="group" aria-label={`${label} numbers`} tabIndex={0} className="grid grid-cols-5 gap-2 p-1 min-h-0 max-h-[50dvh] overflow-y-auto border-0 shadow-none">
            {Array.from({ length: total }, (_, index) => {
              const number = index + 1
              const selected = number === current && !answers?.showing
              return (
                <Button
                  key={number}
                  variant={selected ? 'default' : 'outline'}
                  className={`h-11 min-w-[44px] px-1 ${selected ? 'disabled:opacity-100' : ''}`}
                  disabled={selected || number > available}
                  aria-current={selected ? 'step' : undefined}
                  onClick={() => { setOpen(false); onSelect(number) }}
                >
                  {number}
                </Button>
              )
            })}
            {answers && (
              <Button
                variant={answers.showing ? 'default' : 'outline'}
                className={`col-span-5 min-h-[44px] ${answers.showing ? 'disabled:opacity-100' : ''}`}
                disabled={!answers.revealed || answers.showing}
                aria-current={answers.showing ? 'step' : undefined}
                onClick={() => { setOpen(false); answers.onSelect() }}
              >
                Answers
              </Button>
            )}
          </Card>
        </DialogContent>
      </Dialog>{' '}
      of{' '}
      <Button variant="secondary" className="h-11 min-w-[44px] px-2 text-slate-500 dark:text-slate-400 disabled:opacity-100" disabled aria-label={`Total ${label.toLowerCase()}s`}>
        {total}
      </Button>
    </CardDescription>
  )
}

function QuestionCard({ item, number, reveal = false, onReplaced }: {
  item: HostQuestion
  number?: number
  reveal?: boolean
  onReplaced?: (record: GameQuestion, question: Question) => void
}) {
  const { question, answers } = item
  return (
    <Card className="shadow-none break-words">
      <CardHeader className="p-3 md:p-4 space-y-3">
        {number && <CardDescription>Question {number}</CardDescription>}
        <CardDescription className="flex flex-wrap items-center gap-2 [&>button]:ml-auto">
          <Badge variant="secondary">{question.category}</Badge>
          {question.subcategory && <Badge variant="secondary">{question.subcategory}</Badge>}
          <Badge variant="outline" className={`text-[11px] px-2 rounded capitalize ${
            question.difficulty === 'easy' ? 'bg-[#ecfdf5] dark:bg-emerald-950/40 text-[#065f46] dark:text-emerald-400 border-[#d1fae5] dark:border-emerald-900/50' :
            question.difficulty === 'medium' ? 'bg-[#fef3c7] dark:bg-yellow-950/40 text-[#92400e] dark:text-yellow-400 border-[#fde68a] dark:border-yellow-900/50' :
            'bg-[#fee2e2] dark:bg-red-950/40 text-[#991b1b] dark:text-red-400 border-[#fecaca] dark:border-red-900/50'
          }`}>
            {question.difficulty}{question.level != null && question.level !== '' ? ` ${question.level}` : ''}
          </Badge>
          {onReplaced && <ReplaceQuestionButton gameQuestion={item.record} question={question} onReplaced={onReplaced} />}
        </CardDescription>
        <CardTitle className="text-base md:text-xl leading-relaxed">{question.question}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 md:px-4 space-y-2">
        {answers.shuffledAnswers.map(answer => {
          const isCorrectAnswer = reveal && answer.label === answers.correctAnswerLabel
          return (
            <Card
              key={answer.label}
              className={`p-3 text-sm md:text-base shadow-none flex items-start justify-between gap-3 ${isCorrectAnswer
                ? 'border-2 bg-green-100 border-green-500 text-green-800 dark:bg-green-900 dark:border-green-500 dark:text-green-200'
                : ''}`}
            >
              {answer.label}. {answer.text}
              {isCorrectAnswer && <Check role="img" aria-label="Correct answer" className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />}
            </Card>
          )
        })}
      </CardContent>
    </Card>
  )
}
