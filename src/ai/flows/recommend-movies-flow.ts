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
1. You MUST provide the REAL official poster URL from TMDB.
2. TMDB URLs follow this structure: https://image.tmdb.org/t/p/w500/<POSTER_ID>.jpg
3. Use your knowledge to find the correct <POSTER_ID> for the movies.
   Examples of REAL paths you MUST follow:
   - "Titanic": https://image.tmdb.org/t/p/w500/9xj7r4Rfsar1H879t8rS6YpU8R7.jpg
   - "The Dark Knight": https://image.tmdb.org/t/p/w500/qJ2tW6WMUDp9sUNvS68PkH29Sih.jpg
   - "Inception": https://image.tmdb.org/t/p/w500/9gk7RjU0Zwqy3STuG49ubS19qD6.jpg
   - "Pulp Fiction": https://image.tmdb.org/t/p/w500/d5iIl9h9btztU0kzUvY7Yqh07YI.jpg

4. NEVER invent IDs. If you are unsure of the TMDB ID, use a direct IMDb CDN URL (m.media-amazon.com).
5. EVERY single posterUrl must lead directly to a .jpg file of the ACTUAL movie poster.
6. NO placeholders, NO picsum, NO unsplash.`,
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
