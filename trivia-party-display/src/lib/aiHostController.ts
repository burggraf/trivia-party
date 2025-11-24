/**
 * AI Host Controller for Trivia Party
 *
 * Subscribes to game events from PocketBase and triggers AI voice responses
 * via the Gemini Live API. Handles all game flow events for pub quiz format.
 */

import pb from './pocketbase';
import { GeminiLiveClient } from './geminiLiveClient';
import type { ConnectionState } from '@/types/gemini';

interface GameEvent {
  id: string;
  game: string;
  type: string;
  round_number?: number;
  question_number?: number;
  metadata?: Record<string, any>;
  created: string;
}

export class AIHostController {
  private geminiClient: GeminiLiveClient;
  private unsubscribe: (() => void) | null = null;
  private isStarted: boolean = false;

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

      // Subscribe to game events
      this.unsubscribe = await pb.collection('game_events').subscribe('*', (e) => {
        if (e.action === 'create' && e.record.game === this.gameId) {
          this.handleGameEvent(e.record as unknown as GameEvent);
        }
      }, {
        filter: `game = "${this.gameId}"`
      });

      this.isStarted = true;
      console.log('[AIHost] Successfully started and subscribed to game events');

    } catch (error) {
      console.error('[AIHost] Failed to start:', error);
      throw error;
    }
  }

  private async handleGameEvent(event: GameEvent): Promise<void> {
    console.log('[AIHost] Handling event:', event.type, event);

    try {
      switch (event.type) {
        case 'game_start':
          await this.handleGameStart(event);
          break;

        case 'round_start':
          await this.handleRoundStart(event);
          break;

        case 'question_start':
          await this.handleQuestionStart(event);
          break;

        case 'question_end':
          await this.handleQuestionEnd(event);
          break;

        case 'answer_reveal':
          await this.handleAnswerReveal(event);
          break;

        case 'scores_update':
          await this.handleScoresUpdate(event);
          break;

        case 'round_end':
          await this.handleRoundEnd(event);
          break;

        case 'game_end':
          await this.handleGameEnd(event);
          break;

        default:
          console.warn('[AIHost] Unknown event type:', event.type);
      }
    } catch (error) {
      console.error('[AIHost] Error handling event:', error);
    }
  }

  private async handleGameStart(_event: GameEvent): Promise<void> {
    const game = await pb.collection('games').getOne(this.gameId);
    const teamCount = game.scoreboard?.teams ? Object.keys(game.scoreboard.teams).length : 0;

    this.geminiClient.sendMessage(
      `Welcome everyone to ${game.name}! We have ${teamCount} teams competing today. ` +
      `Are you ready to test your trivia knowledge? Let's get started!`
    );
  }

  private async handleRoundStart(event: GameEvent): Promise<void> {
    const game = await pb.collection('games').getOne(this.gameId);
    const gameData = typeof game.data === 'string' ? JSON.parse(game.data) : game.data;
    const totalRounds = gameData?.round?.rounds || '?';

    this.geminiClient.sendMessage(
      `Alright folks, here comes Round ${event.round_number} of ${totalRounds}! ` +
      `Get your thinking caps on and let's see what questions we have in store.`
    );
  }

  private async handleQuestionStart(event: GameEvent): Promise<void> {
    // Fetch the current game state to get question details
    const game = await pb.collection('games').getOne(this.gameId);
    const gameData = typeof game.data === 'string' ? JSON.parse(game.data) : game.data;

    if (!gameData?.question) {
      console.warn('[AIHost] Question start event but no question in game data');
      return;
    }

    const question = gameData.question;
    const questionNumber = event.question_number || question.question_number;
    const totalQuestions = gameData.round?.question_count || '?';

    // Build the question prompt with answers
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

  private async handleQuestionEnd(_event: GameEvent): Promise<void> {
    this.geminiClient.sendMessage(
      `Alright, time's up! I hope everyone got their answers in. Let's see how you all did.`
    );
  }

  private async handleAnswerReveal(event: GameEvent): Promise<void> {
    // Fetch the current game state to get the correct answer
    const game = await pb.collection('games').getOne(this.gameId);
    const gameData = typeof game.data === 'string' ? JSON.parse(game.data) : game.data;

    if (!gameData?.question) {
      console.warn('[AIHost] Answer reveal event but no question in game data');
      return;
    }

    const question = gameData.question;
    const correctAnswer = question.correct_answer;

    if (!correctAnswer) {
      console.warn('[AIHost] No correct answer in question data');
      return;
    }

    // Get the full answer text
    const answerText = question[correctAnswer.toLowerCase()] || correctAnswer;

    // Check if there's a fun fact or additional info in metadata
    const funFact = event.metadata?.fun_fact;

    let message = `The correct answer is: ${correctAnswer}. ${answerText}!`;

    if (funFact) {
      message += ` Here's an interesting fact: ${funFact}`;
    }

    this.geminiClient.sendMessage(message);
  }

  private async handleScoresUpdate(_event: GameEvent): Promise<void> {
    // Fetch current scoreboard
    const game = await pb.collection('games').getOne(this.gameId);

    if (!game.scoreboard?.teams) {
      return;
    }

    // Get team scores sorted by score
    const teams = Object.entries(game.scoreboard.teams)
      .map(([id, team]: [string, any]) => ({ id, name: team.name, score: team.score }))
      .sort((a, b) => b.score - a.score);

    if (teams.length === 0) {
      return;
    }

    // Announce the leader
    const leader = teams[0];
    const message = teams.length === 1
      ? `${leader.name} has ${leader.score} points!`
      : `${leader.name} is in the lead with ${leader.score} points!`;

    this.geminiClient.sendMessage(message);
  }

  private async handleRoundEnd(event: GameEvent): Promise<void> {
    const game = await pb.collection('games').getOne(this.gameId);
    const gameData = typeof game.data === 'string' ? JSON.parse(game.data) : game.data;
    const totalRounds = gameData?.round?.rounds || '?';

    this.geminiClient.sendMessage(
      `And that's the end of Round ${event.round_number}! ` +
      (event.round_number === totalRounds
        ? `What a great final round! Let's see the final scores.`
        : `Great job everyone! Let's see the current standings before we move on.`)
    );
  }

  private async handleGameEnd(_event: GameEvent): Promise<void> {
    // Fetch final scoreboard
    const game = await pb.collection('games').getOne(this.gameId);

    if (!game.scoreboard?.teams) {
      this.geminiClient.sendMessage(
        `What a fantastic game! Thank you all for playing. You've been a wonderful audience!`
      );
      return;
    }

    // Get teams sorted by score
    const teams = Object.entries(game.scoreboard.teams)
      .map(([id, team]: [string, any]) => ({ id, name: team.name, score: team.score }))
      .sort((a, b) => b.score - a.score);

    if (teams.length === 0) {
      return;
    }

    // Announce the winner(s)
    const winner = teams[0];
    const istie = teams.length > 1 && teams[1].score === winner.score;

    let message = `What an incredible game! `;

    if (istie) {
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
  }

  getConnectionState(): ConnectionState {
    return this.geminiClient.getState();
  }

  // Allow manual messages (for testing)
  sendMessage(text: string): void {
    this.geminiClient.sendMessage(text);
  }
}
