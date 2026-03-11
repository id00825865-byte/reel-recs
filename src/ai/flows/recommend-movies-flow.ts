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
   Examples:
   - "The Godfather": https://image.tmdb.org/t/p/w500/3bhkrj06YpU8R7pS69YpU8R7pS6.jpg
   - "Pulp Fiction": https://image.tmdb.org/t/p/w500/fIE33gaGEuSMvpk77qvZIB66v0X.jpg
   - "The Shawshank Redemption": https://image.tmdb.org/t/p/w500/9cq363Z9R69MDTk999p3mG6P25w.jpg
   - "Inception": https://image.tmdb.org/t/p/w500/9gk7698LqllRzCqWpQDqK6P3qIn.jpg
   - "The Dark Knight": https://image.tmdb.org/t/p/w500/qJ2tW6WMUDp9QmSJJhUvIS6o30k.jpg
3. Use your internal knowledge to retrieve the EXACT poster_path for these and any other films. Do NOT hallucinate random characters.
4. DO NOT use placeholder images like Picsum, Unsplash, or generic "movie" search results.
5. If TMDB is unavailable, use a high-quality direct link from Amazon (m.media-amazon.com).`,
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
