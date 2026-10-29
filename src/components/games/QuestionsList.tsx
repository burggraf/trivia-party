import { useState, useEffect, useCallback } from 'react'
import { gameQuestionsService, type GameQuestion } from '@/lib/gameQuestions'
import { questionsService, type Question } from '@/lib/questions'
import { getShuffledAnswers } from '@/lib/answerShuffler'
import ReplaceQuestionButton from './ReplaceQuestionButton'

interface QuestionsListProps {
  roundId?: string
  roundTitle: string
}

export default function QuestionsList({ roundId, roundTitle }: QuestionsListProps) {
  const [roundQuestions, setRoundQuestions] = useState<GameQuestion[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  const fetchQuestions = useCallback(async () => {
    if (!roundId) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const records = await gameQuestionsService.getGameQuestions(roundId)
      setRoundQuestions(records)
      const details = await Promise.all(records.map(async record => {
        try {
          return await questionsService.getQuestionById(record.question)
        } catch (error) {
          console.error(`Failed to fetch question ${record.question}:`, error)
          return null
        }
      }))
      setQuestions(details.filter((question): question is Question => question !== null))
    } catch (error) {
      console.error('Failed to fetch round questions:', error)
    } finally {
      setLoading(false)
    }
  }, [roundId])

  useEffect(() => { void fetchQuestions() }, [fetchQuestions])

  // Combine round questions with their question details
  const questionsWithDetails = roundQuestions.map(rq => {
    const question = questions.find(q => q.id === rq.question)
    return {
      ...rq,
      questionDetails: question
    }
  }).sort((a, b) => a.sequence - b.sequence)

  if (!roundId) {
    return (
      <div>
        <div className="px-4 py-3 border-b border-[#e5e5e5] dark:border-slate-700">
          <h4 className="text-[13px] font-semibold text-[#0a0a0a] dark:text-white">Questions for {roundTitle}</h4>
          <p className="text-[12px] text-slate-600 dark:text-slate-300 mt-0.5">Round not specified for question display</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="px-4 py-3 border-b border-[#e5e5e5] dark:border-slate-700">
        <h4 className="text-[13px] font-semibold text-[#0a0a0a] dark:text-white">Questions</h4>
        <p className="text-[12px] text-slate-600 dark:text-slate-300 mt-0.5">
          {loading
            ? 'Loading questions...'
            : questionsWithDetails.length > 0
              ? `${questionsWithDetails.length} question${questionsWithDetails.length === 1 ? '' : 's'} in this round (answers shuffled)`
              : 'No questions assigned to this round yet'
          }
        </p>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-[13px] text-slate-600 dark:text-slate-300">Loading questions...</div>
          </div>
        ) : questionsWithDetails.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <p className="text-[13px] text-slate-600 dark:text-slate-300 mb-1">No questions found</p>
              <p className="text-[12px] text-slate-500 dark:text-slate-300">
                Questions will be added when the round is created
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {questionsWithDetails.map((roundQuestion) => (
              <div
                key={roundQuestion.id}
                className="flex items-start justify-between p-3 bg-[#fafafa] dark:bg-slate-800 rounded-md border border-[#e5e5e5] dark:border-slate-700 hover:bg-white dark:hover:bg-slate-750 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Q{roundQuestion.sequence}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-[#f5f5f5] dark:bg-slate-900 text-[#525252] dark:text-slate-400 border border-[#e5e5e5] dark:border-slate-700">
                      {roundQuestion.category_name}
                    </span>
                    {roundQuestion.questionDetails?.difficulty && (
                      <span className={`text-[11px] px-2 py-0.5 rounded border ${
                        roundQuestion.questionDetails.difficulty === 'easy' ? 'bg-[#ecfdf5] dark:bg-emerald-950/40 text-[#065f46] dark:text-emerald-400 border-[#d1fae5] dark:border-emerald-900/50' :
                        roundQuestion.questionDetails.difficulty === 'medium' ? 'bg-[#fef3c7] dark:bg-yellow-950/40 text-[#92400e] dark:text-yellow-400 border-[#fde68a] dark:border-yellow-900/50' :
                        'bg-[#fee2e2] dark:bg-red-950/40 text-[#991b1b] dark:text-red-400 border-[#fecaca] dark:border-red-900/50'
                      }`}>
                        {roundQuestion.questionDetails.difficulty}{roundQuestion.questionDetails.level != null && roundQuestion.questionDetails.level !== '' ? ` ${roundQuestion.questionDetails.level}` : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] font-medium text-[#0a0a0a] dark:text-white mb-2">
                    {roundQuestion.questionDetails?.question || 'Question not found'}
                  </p>
                  {roundQuestion.questionDetails?.answer_a && (() => {
                    // Use the secure key to shuffle answers (host-only view)
                    const shuffledResult = getShuffledAnswers(
                      roundQuestion.key,
                      roundQuestion.questionDetails.answer_a,
                      roundQuestion.questionDetails.answer_b,
                      roundQuestion.questionDetails.answer_c,
                      roundQuestion.questionDetails.answer_d
                    );

                    return (
                      <div className="space-y-1">
                        {shuffledResult.shuffledAnswers.map((answer, index) => (
                          <div
                            key={index}
                            className={`text-[12px] ${
                              answer.originalIndex === 0
                                ? 'font-medium text-[#065f46] dark:text-emerald-400'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {answer.label}) {answer.text}
                            {answer.originalIndex === 0 && (
                              <span className="ml-2 text-[#10b981] dark:text-emerald-400 text-[11px]">
                                ✓ Correct
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                {roundQuestion.questionDetails && (
                  <ReplaceQuestionButton gameQuestion={roundQuestion} question={roundQuestion.questionDetails} onReplaced={() => void fetchQuestions()} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}