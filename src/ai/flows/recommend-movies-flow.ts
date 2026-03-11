'use server';
/**
 * @fileOverview A movie recommendation AI agent with memory.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecommendMoviesInputSchema = z.object({
  preferences: z
    .string()
    .describe('The user\'s natural language description of movie preferences.'),
  excludeMovies: z
    .array(z.string())
    .optional()
    .describe('A list of movie titles the user has already watched and should NOT be recommended.'),
});
export type RecommendMoviesInput = z.infer<typeof RecommendMoviesInputSchema>;

const RecommendMoviesOutputSchema = z.object({
  movies: z
    .array(
      z.object({
        title: z.string().describe('The title of the movie.'),
        posterUrl: z.string().url().describe('A direct URL to the movie official poster (TMDB w500 preferred).'),
        synopsis: z.string().describe('A brief summary or synopsis of the movie.'),
        director: z.string().describe('The name of the movie\'s director.'),
        actors: z.array(z.string()).describe('A list of the main actors.'),
      })
    )
    .min(3)
    .describe('An array of recommended movies.'),
});
export type RecommendMoviesOutput = z.infer<typeof RecommendMoviesOutputSchema>;

export async function recommendMovies(input: RecommendMoviesInput): Promise<RecommendMoviesOutput> {
  const result = await recommendMoviesFlow(input);
  return result;
}

const prompt = ai.definePrompt({
  name: 'recommendMoviesPrompt',
  input: {schema: RecommendMoviesInputSchema},
  output: {schema: RecommendMoviesOutputSchema},
  prompt: `You are an expert movie librarian with access to a massive internal database of film metadata.

USER PREFERENCES: {{{preferences}}}

{{#if excludeMovies}}
CRITICAL: The user has already watched the following movies. You MUST NOT recommend any of these:
{{#each excludeMovies}}
- {{{this}}}
{{/each}}
{{/if}}

INSTRUCTIONS:
1. Provide unique and high-quality recommendations that fit the user's mood and preferences.
2. For each movie, you MUST provide the REAL official poster URL from TMDB (The Movie Database).
   TMDB URLs follow this EXACT pattern: https://image.tmdb.org/t/p/w500/<poster_path>.jpg
   
   USE YOUR INTERNAL KNOWLEDGE TO RETRIEVE THE EXACT POSTER_PATH. 
   Examples of real paths you should know:
   - "The Godfather": https://image.tmdb.org/t/p/w500/3bhkrj06YpU8R7pS69YpU8R7pS6.jpg (NO, this is an example, use the REAL one)
   - "Pulp Fiction": https://image.tmdb.org/t/p/w500/fIE33gaGEuSMvpk77qvZIB66v0X.jpg
   - "The Shawshank Redemption": https://image.tmdb.org/t/p/w500/9cq363Z9R69MDTk999p3mG6P25w.jpg
   - "Inception": https://image.tmdb.org/t/p/w500/9gk7698LqllRzCqWpQDqK6P3qIn.jpg
   - "Fight Club": https://image.tmdb.org/t/p/w500/pB8BM79vS7vMDbu9SmyvH97qycL.jpg

3. DO NOT hallucinate random characters. If you are not 100% sure of the TMDB path, use a direct high-quality image link from Amazon (m.media-amazon.com) which you also have in your knowledge base.
4. ABSOLUTELY FORBIDDEN: Do not use placeholder images, picsum, or generic search result URLs.
5. If the movie is very recent, try to find the standard promotional poster URL.`,
});

const recommendMoviesFlow = ai.defineFlow(
  {
    name: 'recommendMoviesFlow',
    inputSchema: RecommendMoviesInputSchema,
    outputSchema: RecommendMoviesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) throw new Error('No se pudieron generar recomendaciones.');
    return output;
  }
);
