/**
 * AI Host Events - Create game events for AI voice reactions
 *
 * These events are created during gameplay and trigger the AI host
 * in the display app to provide voice commentary.
 */

import pb from './pocketbase';

export interface CreateGameEventParams {
  gameId: string;
  type: string;
  roundNumber?: number;
  questionNumber?: number;
  questionId?: string;
  gameQuestionId?: string;
  metadata?: Record<string, any>;
}

/**
 * Core function to create a game event
 */
export async function createGameEvent(params: CreateGameEventParams): Promise<void> {
  try {
    await pb.collection('game_events').create({
      game: params.gameId,
      type: params.type,
      round_number: params.roundNumber,
      question_number: params.questionNumber,
      question: params.questionId,
      game_question: params.gameQuestionId,
      metadata: params.metadata
    });

    console.log('[AIHostEvents] Created event:', params.type);
  } catch (error) {
    console.error('[AIHostEvents] Failed to create event:', error);
    // Don't throw - AI events should not break game flow
  }
}

/**
 * Game start event - triggered when game begins
 */
export async function gameStartEvent(gameId: string): Promise<void> {
  return createGameEvent({
    gameId,
    type: 'game_start'
  });
}

/**
 * Round start event - triggered at beginning of each round
 */
export async function roundStartEvent(gameId: string, roundNumber: number): Promise<void> {
  return createGameEvent({
    gameId,
    type: 'round_start',
    roundNumber
  });
}

/**
 * Question start event - triggered when question is presented
 * AI will read the question and answer choices
 */
export async function questionStartEvent(
  gameId: string,
  roundNumber: number,
  questionNumber: number,
  gameQuestionId: string,
  questionId: string
): Promise<void> {
  return createGameEvent({
    gameId,
    type: 'question_start',
    roundNumber,
    questionNumber,
    gameQuestionId,
    questionId
  });
}

/**
 * Question end event - triggered when time expires or host advances
 */
export async function questionEndEvent(
  gameId: string,
  roundNumber: number,
  questionNumber: number
): Promise<void> {
  return createGameEvent({
    gameId,
    type: 'question_end',
    roundNumber,
    questionNumber
  });
}

/**
 * Answer reveal event - triggered when correct answer is shown
 * Includes optional fun fact from question metadata
 */
export async function answerRevealEvent(
  gameId: string,
  correctAnswer: string,
  funFact?: string
): Promise<void> {
  return createGameEvent({
    gameId,
    type: 'answer_reveal',
    metadata: {
      correct_answer: correctAnswer,
      fun_fact: funFact
    }
  });
}

/**
 * Scores update event - triggered after answers are graded
 * AI will announce current leader
 */
export async function scoresUpdateEvent(gameId: string): Promise<void> {
  return createGameEvent({
    gameId,
    type: 'scores_update'
  });
}

/**
 * Round end event - triggered at end of each round
 */
export async function roundEndEvent(gameId: string, roundNumber: number): Promise<void> {
  return createGameEvent({
    gameId,
    type: 'round_end',
    roundNumber
  });
}

/**
 * Game end event - triggered when game completes
 * AI will announce winner and thank players
 */
export async function gameEndEvent(gameId: string): Promise<void> {
  return createGameEvent({
    gameId,
    type: 'game_end'
  });
}
