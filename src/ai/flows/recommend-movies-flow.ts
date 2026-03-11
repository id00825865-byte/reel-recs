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
        posterUrl: z.string().url().describe('A direct URL to the movie official poster (TMDB preferred).'),
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
  prompt: `You are an expert movie librarian.

USER PREFERENCES: {{{preferences}}}

{{#if excludeMovies}}
CRITICAL: The user has already watched the following movies. You MUST NOT recommend any of these:
{{#each excludeMovies}}
- {{{this}}}
{{/each}}
{{/if}}

INSTRUCTIONS:
1. Provide unique and high-quality recommendations.
2. For each movie, you MUST provide the REAL official poster URL from TMDB (The Movie Database).
   TMDB URLs follow this pattern: https://image.tmdb.org/t/p/w600_and_h900_bestv2/<poster_path>.jpg
   Example for "The Godfather": https://image.tmdb.org/t/p/w600_and_h900_bestv2/3bhkrj06YpU8R7pS69YpU8R7pS6.jpg
   Example for "The Matrix": https://image.tmdb.org/t/p/w600_and_h900_bestv2/f89U3Y9L7dbptvTMRccp9zKIpaX.jpg
3. SEARCH for the specific poster_path for each movie. Do NOT hallucinate URLs that don't exist.
4. If TMDB is absolutely unavailable, use a high-quality official poster from m.media-amazon.com.
5. ONLY if the movie is extremely obscure or non-existent (which shouldn't happen), you may use a high-quality placeholder from Unsplash or Picsum, but this is a last resort.`,
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
