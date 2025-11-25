/**
 * AI Host Controller for Trivia Party
 *
 * Subscribes to game record changes from PocketBase and triggers AI voice responses
 * via the Gemini Live API. Detects state transitions by comparing previous and current
 * game data, eliminating the need for a separate game_events collection.
 *
 * Prompts are designed to give Gemini the DATA and INTENT, allowing its personality
 * to drive the actual delivery for natural, varied, human-like speech.
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
        ? ` (players: ${team.players.join(', ')})`
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
    const last = teams[teams.length - 1];
    const gap = leader.score - second.score;

    if (gap === 0) {
      const tiedTeams = teams.filter(t => t.score === leader.score);
      if (tiedTeams.length > 2) {
        hints.push(`${tiedTeams.length}-way tie at the top!`);
      } else {
        hints.push(`${leader.name} and ${second.name} are tied!`);
      }
    } else if (gap <= 2) {
      hints.push(`Very close race - only ${gap} point${gap === 1 ? '' : 's'} separating the top teams.`);
    } else if (gap >= 10) {
      hints.push(`${leader.name} has a commanding lead of ${gap} points.`);
    }

    if (teams.length > 2 && last.score < leader.score - 5) {
      hints.push(`${last.name} will need a strong comeback.`);
    }

    return hints.join(' ');
  }

  private handleGameStart(game: GamesRecord, gameData: GameData): void {
    const teams = this.getTeamsWithPlayers(game);
    const totalRounds = gameData.round?.rounds ?? '?';

    const teamIntros = teams.map(team => {
      if (team.players.length > 0) {
        return `Team "${team.name}" with players: ${team.players.join(', ')}`;
      }
      return `Team "${team.name}"`;
    }).join('\n');

    const prompt = `[GAME STARTING - WELCOME EVERYONE]

=== GAME INFO ===
Game name: "${game.name}"
Total rounds: ${totalRounds}
Number of teams: ${teams.length}

=== TEAMS & PLAYERS ===
${teamIntros || 'No teams registered yet'}

=== YOUR TASK ===
Welcome everyone to this trivia game! This is your opening - make it memorable.
- Introduce yourself briefly (you're Terry, the host)
- Mention the game name
- Introduce each team by name and call out their players
- Build excitement for the competition ahead
- Mention how many rounds we'll be playing

BE SPONTANEOUS! Vary your delivery - don't use the same phrases every time.
Have fun with the team names. Make players feel welcomed and pumped up.
Keep it energetic but not too long - about 20-30 seconds.`;

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

    // Only show scores if not round 1
    const scoreSection = roundNumber > 1 ? `
=== CURRENT STANDINGS ===
${this.buildScoreboardSummary(teams)}

Score analysis: ${this.analyzeScores(teams) || 'Everyone starting fresh!'}` : '';

    const prompt = `[ROUND ${roundNumber} STARTING]

=== ROUND INFO ===
Round: ${roundNumber}${totalRounds ? ` of ${totalRounds}` : ''}
Questions this round: ${questionCount}
${category ? `Category: ${category}` : 'Category: Mixed/General'}
${scoreSection}

=== YOUR TASK ===
Announce that Round ${roundNumber} is starting!
${category ? `- Mention the category: "${category}"` : '- Let them know it\'s a mixed category round'}
- Tell them how many questions are in this round
${roundNumber > 1 ? '- Briefly acknowledge the current standings (who\'s leading, any close races)' : '- This is round 1, so everyone starts at zero - mention the fresh start'}
${isFinalRound ? '- THIS IS THE FINAL ROUND! Build drama and tension!' : roundsRemaining ? `- Mention there ${roundsRemaining === 1 ? 'is 1 round' : `are ${roundsRemaining} rounds`} left after this one` : ''}

BE SPONTANEOUS! Vary your energy and phrasing.
${roundNumber > 1 ? 'React naturally to the scores - is it close? Is someone running away with it?' : ''}
Keep it punchy - about 10-15 seconds.`;

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
    const category = question.category || gameData.round?.title || 'General';
    const difficulty = question.difficulty || 'Medium';
    const isLastQuestion = questionNumber === totalQuestions;
    const isFirstQuestion = questionNumber === 1;

    const prompt = `[QUESTION TIME]

=== QUESTION INFO ===
Question ${questionNumber} of ${totalQuestions}
Category: ${category}
Difficulty: ${difficulty}
${isFirstQuestion ? '(First question of the round!)' : ''}
${isLastQuestion ? '(LAST QUESTION of this round!)' : ''}

=== THE QUESTION ===
"${question.question}"

=== ANSWER CHOICES ===
A: ${question.a}
B: ${question.b}
C: ${question.c}
D: ${question.d}

=== YOUR TASK ===
Present this question to the teams!
- Read the question clearly and with good pacing
- Read ALL FOUR answer choices (A, B, C, D) clearly
- ${isLastQuestion ? 'Build tension - this is the last question of the round!' : ''}
- ${isFirstQuestion ? 'Set the tone - first question, let\'s see what they\'ve got!' : ''}
- Encourage teams to discuss and submit their answers

IMPORTANT: You MUST read the full question and ALL answer choices clearly.
Add your own flair - maybe a quick reaction to an interesting question,
build suspense, or comment on the difficulty. Keep each delivery fresh!`;

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

    const answerKey = correctAnswer.toLowerCase() as 'a' | 'b' | 'c' | 'd';
    const answerText = question[answerKey] || correctAnswer;
    const teams = this.getTeamsWithPlayers(game);

    const prompt = `[ANSWER REVEAL]

=== THE ANSWER ===
Correct answer: ${correctAnswer}
Full answer: "${answerText}"

=== THE QUESTION WAS ===
"${question.question}"

=== CURRENT SCORES ===
${this.buildScoreboardSummary(teams)}

=== YOUR TASK ===
Reveal the correct answer!
- Announce that the answer is ${correctAnswer}: "${answerText}"
- React naturally - was it tricky? Surprising? A classic?
- Share a brief interesting tidbit or fun fact related to the answer (make it educational!)
- Keep the energy up

BE SPONTANEOUS! Vary how you reveal answers - sometimes dramatic pause,
sometimes quick reveal, sometimes playful teasing. Keep it fresh and engaging!
About 15-20 seconds including the fun fact.`;

    this.geminiClient.sendMessage(prompt);
  }

  private handleRoundEnd(game: GamesRecord, gameData: GameData): void {
    const roundNumber = gameData.round?.round_number ?? 1;
    const totalRounds = gameData.round?.rounds;
    const roundsRemaining = totalRounds ? totalRounds - roundNumber : null;
    const isFinalRound = totalRounds ? roundNumber === totalRounds : false;
    const teams = this.getTeamsWithPlayers(game);
    const scoreAnalysis = this.analyzeScores(teams);

    const roundsRemainingText = roundsRemaining !== null
      ? (roundsRemaining === 1 ? '1 round' : `${roundsRemaining} rounds`)
      : 'more rounds';

    const prompt = `[ROUND ${roundNumber} COMPLETE]

=== ROUND SUMMARY ===
Completed: Round ${roundNumber}${totalRounds ? ` of ${totalRounds}` : ''}
${isFinalRound ? '>>> THIS WAS THE FINAL ROUND! <<<' : `Rounds remaining: ${roundsRemainingText}`}

=== FULL SCOREBOARD ===
${this.buildScoreboardSummary(teams)}

=== SCORE ANALYSIS ===
${scoreAnalysis || 'Scores are spread out.'}

=== YOUR TASK ===
Wrap up Round ${roundNumber} and discuss the scores!

MUST COVER:
- Announce the round is complete
- Go through the current standings - mention EVERY team by name and their score
- Comment on the race: Who's leading? How close is it? Any surprises?
- ${isFinalRound
    ? 'THIS IS IT! The game is over! Build to the final results (game end announcement comes next)'
    : `Mention there ${roundsRemainingText === '1 round' ? 'is' : 'are'} ${roundsRemainingText} left - can trailing teams catch up?`}

BE SPONTANEOUS! React genuinely to the standings.
- If it's close, build the tension!
- If someone's dominating, acknowledge it
- If there's an underdog, root for the comeback
- Use team names naturally in your commentary

This is a key moment - take about 20-30 seconds to really break down the standings.`;

    this.geminiClient.sendMessage(prompt);
  }

  private handleGameEnd(game: GamesRecord): void {
    const teams = this.getTeamsWithPlayers(game);

    if (teams.length === 0) {
      this.geminiClient.sendMessage(
        `[GAME OVER] What a game! Thank everyone for playing and wrap up with energy!`
      );
      return;
    }

    const winner = teams[0];
    const isTie = teams.length > 1 && teams[1].score === winner.score;
    const tiedTeams = isTie ? teams.filter(t => t.score === winner.score) : [];
    const marginOfVictory = teams.length > 1 ? winner.score - teams[1].score : 0;

    const prompt = `[GAME OVER - FINAL RESULTS]

=== FINAL STANDINGS ===
${this.buildScoreboardSummary(teams)}

=== WINNER INFO ===
${isTie
  ? `TIE GAME! Teams tied for first: ${tiedTeams.map(t => t.name).join(' and ')} with ${winner.score} points!`
  : `WINNER: ${winner.name} with ${winner.score} points!`}
${!isTie && marginOfVictory > 0 ? `Margin of victory: ${marginOfVictory} points` : ''}
${winner.players.length > 0 ? `Winning players: ${winner.players.join(', ')}` : ''}

=== YOUR TASK ===
This is the BIG FINALE! Make it memorable!

MUST COVER:
- Build dramatic tension before announcing the winner
- ${isTie
    ? `Announce the TIE! Celebrate both/all tied teams: ${tiedTeams.map(t => t.name).join(' and ')}`
    : `Crown the champion: ${winner.name}! Celebrate them!`}
- Give a shoutout to ALL teams - everyone played well
- Thank everyone for playing
- End on a high note - this was a great game!

BE SPONTANEOUS! This is your moment to shine as a host.
Make the winners feel like champions. Make everyone feel good about playing.
Build the drama, deliver the payoff, and close the show with style!
Take about 30-40 seconds for this grand finale.`;

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
