import pb from './pocketbase';

export interface Question {
  id: string;
  external_id?: string;
  category: string;
  subcategory: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  answer_a: string;
  answer_b: string;
  answer_c: string;
  answer_d: string;
  level?: string;
  metadata?: string;
  imported_at: string;
}

export const questionsService = {
  async getCategories(): Promise<string[]> {
    try {
      // Get a sample of questions to extract unique categories
      const result = await pb.collection('questions').getList<Question>(1, 100);

      // Extract unique categories
      const categories = [...new Set(result.items.map(q => q.category))];

      return categories.sort();
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      return [];
    }
  },

  async getQuestionsByCategories(categories: string[]): Promise<Question[]> {
    try {
      // For now, we'll fetch all questions and filter client-side
      const result = await pb.collection('questions').getList<Question>(1, 1000);

      // Filter by categories
      const filteredQuestions = result.items.filter(q =>
        categories.includes(q.category)
      );

      return filteredQuestions;
    } catch (error) {
      console.error('Failed to fetch questions by categories:', error);
      return [];
    }
  },

  async getQuestionById(id: string): Promise<Question> {
    try {
      const record = await pb.collection('questions').getOne<Question>(id);
      return record;
    } catch (error) {
      console.error('Failed to fetch question:', error);
      throw error;
    }
  },

  async getRandomQuestions(
    questionCount: number,
    hostId?: string,
    minLevel?: number,
    maxLevel?: number
  ): Promise<Question[]> {
    try {
      const currentHostId = hostId || pb.authStore.model?.id;
      if (!currentHostId) throw new Error('User not authenticated');

      // Build level filter if specified
      const levelFilters: string[] = [];
      if (minLevel !== undefined) {
        levelFilters.push(`level >= ${minLevel}`);
      }
      if (maxLevel !== undefined) {
        levelFilters.push(`level <= ${maxLevel}`);
      }
      const levelFilter = levelFilters.length > 0 ? levelFilters.join(' && ') : undefined;

      // Step 1: Fetch a reasonable pool of random questions from all categories
      // Use server-side random sorting and fetch 10x the needed amount to ensure enough after filtering
      const poolSize = Math.min(questionCount * 10, 1000); // Cap at 1000 to avoid rate limits
      const randomQuestionsResult = await pb.collection('questions').getList<Question>(1, poolSize, {
        filter: levelFilter,
        sort: '@random', // Server-side random sorting
        skipTotal: true  // Skip counting total records for performance
      });

      if (randomQuestionsResult.items.length === 0) {
        return [];
      }

      // Step 2: Get recently used questions by this host (limit to recent 500 to avoid rate limits)
      const usedQuestionsResult = await pb.collection('game_questions').getList(1, 500, {
        filter: `host = "${currentHostId}"`,
        sort: '-created', // Get most recent first
        skipTotal: true
      });

      const usedQuestionIds = new Set(usedQuestionsResult.items.map(rq => rq.question));

      // Step 3: Filter out used questions to ensure no reuse
      const availableQuestions = randomQuestionsResult.items.filter(q => !usedQuestionIds.has(q.id));

      if (availableQuestions.length < questionCount) {
        console.warn(`Only ${availableQuestions.length} unique questions available, but ${questionCount} requested`);
      }

      // Step 4: Return the requested number of questions (already randomized by server)
      return availableQuestions.slice(0, Math.min(questionCount, availableQuestions.length));
    } catch (error) {
      console.error('Failed to get random questions:', error);
      return [];
    }
  }
};