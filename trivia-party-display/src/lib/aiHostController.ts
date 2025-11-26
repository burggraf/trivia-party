/**
 * AI Host Controller for Trivia Party
 *
 * Subscribes to game record changes from PocketBase and triggers AI voice responses
 * via the Gemini Live API. Detects state transitions by comparing previous and current
 * game data, eliminating the need for a separate game_events collection.
 *
 * Prompts provide DATA to speak and brief guidance. The system instruction defines
 * Terry's personality - these prompts just feed information.
 */

import pb from './pocketbase';
import { GeminiLiveClient } from './geminiLiveClient';
import type { ConnectionState } from '@/types/gemini';
import type { GamesRecord } from '@/types/pocketbase-types';
import type { GameData, GameState, ScoreboardTeam } from '@/types/games';

interface TrackedState {
  state: GameState | null;
  roundNumber: number | null;
  questionNumber: number | null;
  answerRevealed: boolean;
}

interface TeamScore {
  name: string;
  score: number;
  players: string[];
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
      this.handleGameStart(game, gameData);
    }

    // Round start: entering round-start state (new round)
    if (current.state === 'round-start' && prev.state !== 'round-start') {
      this.handleRoundStart(game, gameData);
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
      this.handleRoundEnd(game, gameData);
    }

    // Game end: entering game-end state
    if (current.state === 'game-end' && prev.state !== 'game-end') {
      this.handleGameEnd(game);
    }
  }

  /**
   * Extract team data with players from scoreboard
   */
  private getTeamsWithPlayers(game: GamesRecord): TeamScore[] {
    if (!game.scoreboard?.teams) {
      return [];
    }

    return Object.values(game.scoreboard.teams)
      .map((team: ScoreboardTeam) => ({
        name: team.name,
        score: team.score,
        players: team.players?.map(p => p.name).filter(Boolean) || [],
      }))
      .filter(team => team.players.length > 0) // Ignore teams with no players
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Build a detailed scoreboard summary for commentary
   */
  private buildScoreboardSummary(teams: TeamScore[]): string {
    if (teams.length === 0) return 'No teams yet.';

    const lines = teams.map((team, i) => {
      const position = i + 1;
      const playerList = team.players.length > 0
        ? ` (${team.players.join(', ')})`
        : '';
      return `${position}. ${team.name}: ${team.score} points${playerList}`;
    });

    return lines.join('\n');
  }

  /**
   * Analyze score gaps for commentary hints
   */
  private analyzeScores(teams: TeamScore[]): string {
    if (teams.length < 2) return '';

    const hints: string[] = [];
    const leader = teams[0];
    const second = teams[1];
    const gap = leader.score - second.score;

    if (gap === 0) {
      const tiedTeams = teams.filter(t => t.score === leader.score);
      if (tiedTeams.length > 2) {
        hints.push(`${tiedTeams.length}-way tie at the top`);
      } else {
        hints.push(`${leader.name} and ${second.name} are tied`);
      }
    } else if (gap <= 2) {
      hints.push(`Very close - only ${gap} point${gap === 1 ? '' : 's'} between top teams`);
    } else if (gap >= 10) {
      hints.push(`${leader.name} leading by ${gap} points`);
    }

    return hints.join('. ');
  }

  private handleGameStart(game: GamesRecord, gameData: GameData): void {
    const teams = this.getTeamsWithPlayers(game);
    const totalRounds = gameData.round?.rounds ?? '?';

    const teamIntros = teams.map(team => {
      if (team.players.length > 0) {
        return `- ${team.name}: ${team.players.join(', ')}`;
      }
      return `- ${team.name}`;
    }).join('\n');

    // Simple, direct prompt - let Terry's personality shine through
    const prompt = `Welcome everyone to "${game.name}"!

We have ${teams.length} teams competing tonight across ${totalRounds} rounds.

Here are our teams:
${teamIntros || 'Teams are still joining!'}

Introduce yourself as Terry the host, welcome each team by name, mention their players, and get everyone excited to play!`;

    this.geminiClient.sendMessage(prompt);
  }

  private handleRoundStart(game: GamesRecord, gameData: GameData): void {
    const roundNumber = gameData.round?.round_number ?? 1;
    const totalRounds = gameData.round?.rounds;
    const questionCount = gameData.round?.question_count ?? '?';
    const category = gameData.round?.title || gameData.round?.categories?.[0] || null;
    const teams = this.getTeamsWithPlayers(game);
    const isFinalRound = totalRounds ? roundNumber === totalRounds : false;
    const roundsRemaining = totalRounds ? totalRounds - roundNumber : null;

    let prompt = `Round ${roundNumber}${totalRounds ? ` of ${totalRounds}` : ''} is starting!

This round has ${questionCount} questions.
${category ? `Category: ${category}` : 'Mixed categories this round.'}`;

    if (roundNumber > 1) {
      const scoreAnalysis = this.analyzeScores(teams);
      prompt += `

Current standings:
${this.buildScoreboardSummary(teams)}
${scoreAnalysis ? `\n${scoreAnalysis}.` : ''}`;
    }

    if (isFinalRound) {
      prompt += `\n\nThis is the FINAL ROUND!`;
    } else if (roundsRemaining) {
      prompt += `\n\n${roundsRemaining} round${roundsRemaining === 1 ? '' : 's'} left after this one.`;
    }

    prompt += `\n\nAnnounce the round, ${roundNumber > 1 ? 'comment on the scores,' : ''} and get everyone ready!`;

    this.geminiClient.sendMessage(prompt);
  }

  private handleQuestionStart(gameData: GameData): void {
    const question = gameData.question;
    if (!question) {
      console.warn('[AIHost] Question start but no question in game data');
      return;
    }

    const questionNumber = question.question_number;
    const totalQuestions = gameData.round?.question_count ?? '?';
    const isLastQuestion = questionNumber === totalQuestions;

    // Direct format - just the question and answers to read
    const prompt = `Question ${questionNumber} of ${totalQuestions}${isLastQuestion ? ' - last question of the round!' : ''}

"${question.question}"

A: ${question.a}
B: ${question.b}
C: ${question.c}
D: ${question.d}

Read the question and all four choices clearly. Tell teams to discuss and submit their answers.`;

    this.geminiClient.sendMessage(prompt);
  }

  private handleAnswerReveal(gameData: GameData, _game: GamesRecord): void {
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

    const answerKey = correctAnswer.toLowerCase() as 'a' | 'b' | 'c' | 'd';
    const answerText = question[answerKey] || correctAnswer;

    // Simple reveal with request for fun fact
    const prompt = `The correct answer is ${correctAnswer}: "${answerText}"

The question was: "${question.question}"

Reveal the answer and share one interesting fact about it.`;

    this.geminiClient.sendMessage(prompt);
  }

  private handleRoundEnd(game: GamesRecord, gameData: GameData): void {
    const roundNumber = gameData.round?.round_number ?? 1;
    const totalRounds = gameData.round?.rounds;
    const roundsRemaining = totalRounds ? totalRounds - roundNumber : null;
    const isFinalRound = totalRounds ? roundNumber === totalRounds : false;
    const teams = this.getTeamsWithPlayers(game);
    const scoreAnalysis = this.analyzeScores(teams);

    let prompt = `Round ${roundNumber} is complete!

SCOREBOARD:
${this.buildScoreboardSummary(teams)}
${scoreAnalysis ? `\n${scoreAnalysis}.` : ''}`;

    if (isFinalRound) {
      prompt += `\n\nThat was the final round! The winner is about to be announced!`;
    } else if (roundsRemaining) {
      prompt += `\n\n${roundsRemaining} round${roundsRemaining === 1 ? '' : 's'} to go.`;
    }

    prompt += `\n\nAnnounce the round is over, read through all the scores, and comment on who's leading and how close it is.`;

    this.geminiClient.sendMessage(prompt);
  }

  private handleGameEnd(game: GamesRecord): void {
    const teams = this.getTeamsWithPlayers(game);

    if (teams.length === 0) {
      this.geminiClient.sendMessage(
        `The game is over! Thank everyone for playing and say goodbye!`
      );
      return;
    }

    const winner = teams[0];
    const isTie = teams.length > 1 && teams[1].score === winner.score;
    const tiedTeams = isTie ? teams.filter(t => t.score === winner.score) : [];

    let prompt = `GAME OVER!

FINAL SCORES:
${this.buildScoreboardSummary(teams)}

`;

    if (isTie) {
      prompt += `WE HAVE A TIE! ${tiedTeams.map(t => t.name).join(' and ')} tied with ${winner.score} points!`;
    } else {
      prompt += `THE WINNER IS: ${winner.name} with ${winner.score} points!`;
      if (winner.players.length > 0) {
        prompt += `\nCongratulations to ${winner.players.join(', ')}!`;
      }
    }

    prompt += `\n\nCelebrate the winner, thank all the teams for playing, and close out the show!`;

    this.geminiClient.sendMessage(prompt);
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
