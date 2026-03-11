'use server';
/**
 * @fileOverview A movie recommendation AI agent.
 *
 * - recommendMovies - A function that handles the movie recommendation process.
 * - RecommendMoviesInput - The input type for the recommendMovies function.
 * - RecommendMoviesOutput - The return type for the recommendMovies function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecommendMoviesInputSchema = z.object({
  preferences: z
    .string()
    .describe('The user\u0027s natural language description of movie preferences (e.g., genres, actors, mood, similar movies).'),
});
export type RecommendMoviesInput = z.infer<typeof RecommendMoviesInputSchema>;

const RecommendMoviesOutputSchema = z.object({
  movies: z
    .array(
      z.object({
        title: z.string().describe('The title of the movie.'),
        posterUrl: z.string().url().describe('A URL to the movie poster image.'),
        synopsis: z.string().describe('A brief summary or synopsis of the movie.'),
        director: z.string().describe('The name of the movie\u0027s director.'),
        actors: z.array(z.string()).describe('A list of the main actors in the movie.'),
      })
    )
    .min(3)
    .describe('An array of at least 3 recommended movies.'),
});
export type RecommendMoviesOutput = z.infer<typeof RecommendMoviesOutputSchema>;

export async function recommendMovies(input: RecommendMoviesInput): Promise<RecommendMoviesOutput> {
  return recommendMoviesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendMoviesPrompt',
  input: {schema: RecommendMoviesInputSchema},
  output: {schema: RecommendMoviesOutputSchema},
  prompt: `You are an expert movie recommender. Your task is to analyze the user's preferences and provide at least three highly relevant movie recommendations.

For each recommendation, you must include the following details:
- The movie title.
- A direct URL to a movie poster image. Ensure this is a valid image URL.
- A concise synopsis of the movie.
- The director's name.
- A list of the main actors.

User preferences: {{{preferences}}}`,
});

const recommendMoviesFlow = ai.defineFlow(
  {
    name: 'recommendMoviesFlow',
    inputSchema: RecommendMoviesInputSchema,
    outputSchema: RecommendMoviesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Failed to get movie recommendations from the AI.');
    }
    return output;
  }
);
