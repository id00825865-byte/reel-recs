
'use server';
/**
 * @fileOverview A movie recommendation AI agent with memory, high-fidelity poster retrieval, and mood/duration filters.
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
  mood: z
    .string()
    .optional()
    .describe('The current mood of the user (e.g., Happy, Sad, Exciting).'),
  maxDuration: z
    .string()
    .optional()
    .describe('The maximum duration the user is looking for (e.g., "Under 90 min").'),
});
export type RecommendMoviesInput = z.infer<typeof RecommendMoviesInputSchema>;

const RecommendMoviesOutputSchema = z.object({
  movies: z
    .array(
      z.object({
        title: z.string().describe('The title of the movie.'),
        posterUrl: z.string().url().describe('A direct URL to the movie official poster (TMDB or IMDb/Amazon format).'),
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

{{#if mood}}
CURRENT MOOD: {{{mood}}}
(Tailor recommendations to match this mood).
{{/if}}

{{#if maxDuration}}
MAX DURATION CONSTRAINT: {{{maxDuration}}}
(Strictly recommend movies that fit within this time frame).
{{/if}}

{{#if excludeMovies}}
STRICT EXCLUSION LIST (Do NOT recommend these):
{{#each excludeMovies}}
- {{{this}}}
{{/each}}
{{/if}}

STRICT INSTRUCTIONS FOR POSTERS:
1. You MUST provide the REAL official poster URL.
2. PREFER TMDB format: https://image.tmdb.org/t/p/w500/<POSTER_ID>.jpg
3. SECONDARY format (Amazon/IMDb): https://m.media-amazon.com/images/M/<IMAGE_ID>.jpg
4. Use your knowledge to find the ACTUAL poster ID. 
5. NO placeholders, NO picsum, NO unsplash.
6. EVERY single posterUrl must lead directly to a .jpg file of the ACTUAL movie poster.`,
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
