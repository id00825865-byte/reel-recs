'use server';
/**
 * @fileOverview A movie recommendation AI agent with memory, high-fidelity poster retrieval, and platform availability.
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
    .describe('The current mood of the user (e.g., Happy, Sad, Exciting, Scary, Romantic).'),
  maxDuration: z
    .string()
    .optional()
    .describe('The maximum duration the user is looking for (e.g., "Under 90 min", "More than 120 min").'),
  platform: z
    .string()
    .optional()
    .describe('The streaming platform the user has access to (e.g., Netflix, Disney+, HBO Max).'),
});
export type RecommendMoviesInput = z.infer<typeof RecommendMoviesInputSchema>;

const RecommendMoviesOutputSchema = z.object({
  movies: z
    .array(
      z.object({
        title: z.string().describe('The title of the movie.'),
        year: z.string().describe('The release year of the movie (e.g., "2023").'),
        imdbRating: z.number().describe('The current IMDb rating of the movie (e.g., 8.5).'),
        posterUrl: z.string().url().describe('A direct URL to the movie official poster (TMDB or IMDb/Amazon format).'),
        synopsis: z.string().describe('A brief summary or synopsis of the movie.'),
        duration: z.string().describe('The duration of the movie in hours and minutes (e.g., "1h 45m").'),
        director: z.string().describe('The name of the movie\'s director.'),
        actors: z.array(z.string()).describe('A list of the main actors.'),
        platforms: z.array(z.string()).describe('A list of major streaming platforms where this movie is currently available (e.g., ["Netflix", "Prime Video"]).'),
      })
    )
    .min(4)
    .max(4)
    .describe('An array of exactly 4 recommended movies.'),
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

STRICT INSTRUCTION: You MUST return exactly 4 recommendations.

USER PREFERENCES: {{{preferences}}}

{{#if mood}}
CURRENT MOOD: {{{mood}}}
{{/if}}

{{#if maxDuration}}
DURATION PREFERENCE: {{{maxDuration}}}
{{/if}}

{{#if platform}}
PLATFORM: {{{platform}}}
{{/if}}

{{#if excludeMovies}}
DO NOT RECOMMEND:
{{#each excludeMovies}}
- {{{this}}}
{{/each}}
{{/if}}

INSTRUCTIONS:
1. Provide the duration in hours and minutes (e.g., "2h 15m").
2. Provide the REAL official poster URL from TMDB or Amazon.
3. PREFER TMDB: https://image.tmdb.org/t/p/w500/<POSTER_ID>.jpg
4. SECONDARY (Amazon/IMDb): https://m.media-amazon.com/images/M/<IMAGE_ID>.jpg
5. Always include the release year and the real IMDb rating.
6. List the likely streaming platforms where the movie is available based on your knowledge (Netflix, HBO Max, Disney+, Prime Video, etc.).`,
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
