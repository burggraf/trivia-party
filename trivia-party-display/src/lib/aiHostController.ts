/**
 * AI Host Controller for Trivia Party
 *
 * Subscribes to game record changes from PocketBase and triggers AI voice responses
 * via the Gemini Live API. Detects state transitions by comparing previous and current
 * game data, eliminating the need for a separate game_events collection.
 */

import pb from './pocketbase';
import { GeminiLiveClient } from './geminiLiveClient';
import type { ConnectionState } from '@/types/gemini';
import type { GamesRecord } from '@/types/pocketbase-types';
import type { GameData, GameState } from '@/types/games';

interface TrackedState {
  state: GameState | null;
  roundNumber: number | null;
  questionNumber: number | null;
  answerRevealed: boolean;
}

export class AIHostController {
  private geminiClient: GeminiLiveClient;
  private unsubscribe: (() => void) | null = null;
  private isStarted: boolean = false;
  private previousState: TrackedState = {
    state: null,
    roundNumber: null,
    questionNumber: null,
    answerRevealed: false,
  };

  constructor(private gameId: string) {
    this.geminiClient = new GeminiLiveClient(gameId);
  }

  async start(): Promise<void> {
    if (this.isStarted) {
      console.log('[AIHost] Already started');
      return;
    }

    try {
      console.log('[AIHost] Starting for game:', this.gameId);

      // Connect to Gemini Live API
      await this.geminiClient.connect();
      console.log('[AIHost] Connected to Gemini Live API');

      // Subscribe to game record changes (same pattern as display UI)
      this.unsubscribe = await pb.collection('games').subscribe<GamesRecord>(this.gameId, (e) => {
        if (e.action === 'update') {
          this.handleGameUpdate(e.record);
        }
      });

      this.isStarted = true;
      console.log('[AIHost] Successfully started and subscribed to game updates');

    } catch (error) {
      console.error('[AIHost] Failed to start:', error);
      throw error;
    }
  }

  private handleGameUpdate(game: GamesRecord): void {
    const gameData = typeof game.data === 'string' ? JSON.parse(game.data) : game.data as GameData | undefined;

    if (!gameData?.state) {
      return;
    }

    const currentState: TrackedState = {
      state: gameData.state,
      roundNumber: gameData.round?.round_number ?? null,
      questionNumber: gameData.question?.question_number ?? null,
      answerRevealed: !!gameData.question?.correct_answer,
    };

    console.log('[AIHost] Game update:', {
      previous: this.previousState,
      current: currentState,
    });

    // Detect and handle state transitions
    this.detectAndHandleTransitions(game, gameData, currentState);

    // Update tracked state
    this.previousState = currentState;
  }

  private detectAndHandleTransitions(
    game: GamesRecord,
    gameData: GameData,
    current: TrackedState
  ): void {
    const prev = this.previousState;

    // Game start: state changed to round-start from game-start (or first time seeing round-start)
    if (current.state === 'round-start' && prev.state === 'game-start') {
      this.handleGameStart(game);
    }

    // Round start: entering round-start state (new round)
    if (current.state === 'round-start' && prev.state !== 'round-start') {
      this.handleRoundStart(gameData);
    }

    // Question start: new question in round-play
    if (
      current.state === 'round-play' &&
      current.questionNumber !== null &&
      !current.answerRevealed &&
      (prev.questionNumber !== current.questionNumber || prev.state !== 'round-play')
    ) {
      this.handleQuestionStart(gameData);
    }

    // Answer reveal: correct_answer just appeared
    if (
      current.state === 'round-play' &&
      current.answerRevealed &&
      !prev.answerRevealed
    ) {
      this.handleAnswerReveal(gameData, game);
    }

    // Round end: entering round-end state
    if (current.state === 'round-end' && prev.state !== 'round-end') {
      this.handleRoundEnd(gameData);
    }

    // Game end: entering game-end state
    if (current.state === 'game-end' && prev.state !== 'game-end') {
      this.handleGameEnd(game);
    }
  }

  private handleGameStart(game: GamesRecord): void {
    const teamCount = game.scoreboard?.teams ? Object.keys(game.scoreboard.teams).length : 0;

    this.geminiClient.sendMessage(
      `Welcome everyone to ${game.name}! We have ${teamCount} teams competing today. ` +
      `Are you ready to test your trivia knowledge? Let's get started!`
    );
  }

  private handleRoundStart(gameData: GameData): void {
    const roundNumber = gameData.round?.round_number ?? '?';
    const totalRounds = gameData.round?.rounds ?? '?';
    const category = gameData.round?.title || gameData.round?.categories?.[0];

    let message = `Alright folks, here comes Round ${roundNumber} of ${totalRounds}! `;
    if (category) {
      message += `This round's category is: ${category}. `;
    }
    message += `Get your thinking caps on and let's see what questions we have in store.`;

    this.geminiClient.sendMessage(message);
  }

  private handleQuestionStart(gameData: GameData): void {
    const question = gameData.question;
    if (!question) {
      console.warn('[AIHost] Question start but no question in game data');
      return;
    }

    const questionNumber = question.question_number;
    const totalQuestions = gameData.round?.question_count ?? '?';

    const prompt = `Here's question ${questionNumber} of ${totalQuestions}:

${question.question}

Your answer choices are:
A. ${question.a}
B. ${question.b}
C. ${question.c}
D. ${question.d}

Take your time everyone, discuss with your team, and submit your answers!`;

    this.geminiClient.sendMessage(prompt);
  }

  private handleAnswerReveal(gameData: GameData, game: GamesRecord): void {
    const question = gameData.question;
    if (!question) {
      console.warn('[AIHost] Answer reveal but no question in game data');
      return;
    }

    const correctAnswer = question.correct_answer;
    if (!correctAnswer) {
      console.warn('[AIHost] No correct answer in question data');
      return;
    }

    // Get the full answer text
    const answerKey = correctAnswer.toLowerCase() as 'a' | 'b' | 'c' | 'd';
    const answerText = question[answerKey] || correctAnswer;

    // Build context about team performance for this question
    const teamResults = this.getTeamResultsSummary(game);

    // Request fun fact generation on-the-fly
    const prompt = `The correct answer is ${correctAnswer}: ${answerText}!

${teamResults}

Please share a brief interesting fact related to this question or answer. Keep it concise and engaging.

Question was: ${question.question}`;

    this.geminiClient.sendMessage(prompt);
  }

  private getTeamResultsSummary(game: GamesRecord): string {
    if (!game.scoreboard?.teams) {
      return '';
    }

    const teams = Object.values(game.scoreboard.teams);
    if (teams.length === 0) {
      return '';
    }

    // Get leader info
    const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
    const leader = sortedTeams[0];

    if (sortedTeams.length === 1) {
      return `${leader.name} has ${leader.score} points.`;
    }

    return `${leader.name} is currently leading with ${leader.score} points.`;
  }

  private handleRoundEnd(gameData: GameData): void {
    const roundNumber = gameData.round?.round_number ?? '?';
    const totalRounds = gameData.round?.rounds ?? '?';
    const isFinalRound = roundNumber === totalRounds;

    this.geminiClient.sendMessage(
      `And that's the end of Round ${roundNumber}! ` +
      (isFinalRound
        ? `What a great final round! Let's see the final scores.`
        : `Great job everyone! Let's see the current standings before we move on.`)
    );
  }

  private handleGameEnd(game: GamesRecord): void {
    if (!game.scoreboard?.teams) {
      this.geminiClient.sendMessage(
        `What a fantastic game! Thank you all for playing. You've been a wonderful audience!`
      );
      return;
    }

    // Get teams sorted by score
    const teams = Object.entries(game.scoreboard.teams)
      .map(([id, team]) => ({ id, name: team.name, score: team.score }))
      .sort((a, b) => b.score - a.score);

    if (teams.length === 0) {
      return;
    }

    // Announce the winner(s)
    const winner = teams[0];
    const isTie = teams.length > 1 && teams[1].score === winner.score;

    let message = `What an incredible game! `;

    if (isTie) {
      const tiedTeams = teams.filter(t => t.score === winner.score).map(t => t.name);
      message += `We have a tie! ${tiedTeams.join(' and ')} both finish with ${winner.score} points! `;
    } else {
      message += `Congratulations to ${winner.name} for winning with ${winner.score} points! `;
    }

    message += `Thank you all for playing, and let's give everyone a round of applause!`;

    this.geminiClient.sendMessage(message);
  }

  stop(): void {
    console.log('[AIHost] Stopping...');
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.geminiClient.disconnect();
    this.isStarted = false;
    this.previousState = {
      state: null,
      roundNumber: null,
      questionNumber: null,
      answerRevealed: false,
    };
  }

  getConnectionState(): ConnectionState {
    return this.geminiClient.getState();
  }

  // Allow manual messages (for testing)
  sendMessage(text: string): void {
    this.geminiClient.sendMessage(text);
  }
}
