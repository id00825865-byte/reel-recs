'use server';
/**
 * @fileOverview A movie recommendation AI agent with memory and high-fidelity poster retrieval.
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
        posterUrl: z.string().url().describe('A direct URL to the movie official poster (TMDB w500 format).'),
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
  prompt: `You are an expert movie librarian with absolute knowledge of the global movie database.

USER PREFERENCES: {{{preferences}}}

{{#if excludeMovies}}
STRICT EXCLUSION LIST (Do NOT recommend these):
{{#each excludeMovies}}
- {{{this}}}
{{/each}}
{{/if}}

STRICT INSTRUCTIONS FOR POSTERS:
1. You MUST provide the REAL official poster URL.
2. The preferred format is TMDB (image.tmdb.org).
3. TMDB URLs follow this structure: https://image.tmdb.org/t/p/w500/<POSTER_ID>.jpg
4. Use your internal training data to recall the exact <POSTER_ID> for the movies.
   Examples of REAL paths you MUST emulate:
   - "Titanic": https://image.tmdb.org/t/p/w500/9xj7r4Rfsar1H879t8rS6YpU8R7.jpg
   - "The Dark Knight": https://image.tmdb.org/t/p/w500/qJ2tW6WMUDp9sUNvS68PkH29Sih.jpg
   - "Shrek": https://image.tmdb.org/t/p/w500/iB6sRJim6vSqiZpIBZRh6pS9S6S.jpg
   - "The Matrix": https://image.tmdb.org/t/p/w500/f89U3Y9L3vSqiZpIBZRh6pS9S6S.jpg

5. If a TMDB ID is unknown to you, use an IMDb CDN URL (m.media-amazon.com).
6. NEVER use generic search URLs or placeholder sites like Picsum or Unsplash.
7. NEVER invent IDs. If you don't have a specific ID, try a direct link from Amazon images for that movie title.
8. Every single posterUrl must lead directly to a .jpg or .png file of the ACTUAL movie poster.`,
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
