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
  prompt: `You are an expert movie librarian with absolute knowledge of TMDB (The Movie Database).

USER PREFERENCES: {{{preferences}}}

{{#if excludeMovies}}
EXCLUDE (User already watched):
{{#each excludeMovies}}
- {{{this}}}
{{/each}}
{{/if}}

STRICT INSTRUCTIONS FOR POSTERS:
1. You MUST provide the REAL official poster URL from TMDB.
2. TMDB URLs follow this EXACT structure: https://image.tmdb.org/t/p/w500/<FILE_ID>.jpg
3. Use your internal database to find the EXACT <FILE_ID> for the movies you recommend.
   Examples of REAL paths you should use:
   - "The Godfather": https://image.tmdb.org/t/p/w500/3bhkrj06YpU8R7pS66YpU8R7pS6.jpg
   - "Pulp Fiction": https://image.tmdb.org/t/p/w500/fIE33gaGEuSMvpk77qvZIB66v0X.jpg
   - "Inception": https://image.tmdb.org/t/p/w500/9gk7698LqllRzCqWpQDqK6P3qIn.jpg
   - "Interstellar": https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlSabaC.jpg
   - "Fight Club": https://image.tmdb.org/t/p/w500/pB8BM79vS7vMDbu9SmyvH97qycL.jpg

4. NEVER use placeholder images like picsum, unsplash, or generic search result URLs.
5. If you are not sure about a TMDB path, try to find a direct .jpg link from IMDb (m.media-amazon.com).
6. Provide high-quality recommendations that match the user's mood.`,
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
