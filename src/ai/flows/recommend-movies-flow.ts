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
    .describe('The user\'s natural language description of movie preferences (e.g., genres, actors, mood, similar movies).'),
});
export type RecommendMoviesInput = z.infer<typeof RecommendMoviesInputSchema>;

const RecommendMoviesOutputSchema = z.object({
  movies: z
    .array(
      z.object({
        title: z.string().describe('The title of the movie.'),
        posterUrl: z.string().url().describe('A direct URL to the movie official poster. MUST be from image.tmdb.org or m.media-amazon.com if possible.'),
        synopsis: z.string().describe('A brief summary or synopsis of the movie.'),
        director: z.string().describe('The name of the movie\'s director.'),
        actors: z.array(z.string()).describe('A list of the main actors in the movie.'),
      })
    )
    .min(3)
    .describe('An array of at least 3 recommended movies.'),
});
export type RecommendMoviesOutput = z.infer<typeof RecommendMoviesOutputSchema>;

export async function recommendMovies(input: RecommendMoviesInput): Promise<RecommendMoviesOutput> {
  try {
    const keyToUse = process.env.GOOGLE_GENAI_API_KEY;

    if (!keyToUse) {
      throw new Error('CONFIG_ERROR: El servidor no tiene configurada la clave API.');
    }

    const result = await recommendMoviesFlow(input);
    return result;
  } catch (error: any) {
    console.error('Error en recommendMovies:', error);
    throw new Error('No pudimos obtener recomendaciones. Verifica la API Key o intenta más tarde.');
  }
}

const prompt = ai.definePrompt({
  name: 'recommendMoviesPrompt',
  input: {schema: RecommendMoviesInputSchema},
  output: {schema: RecommendMoviesOutputSchema},
  prompt: `You are an expert movie librarian. Your goal is to provide high-quality movie recommendations.

CRITICAL INSTRUCTIONS FOR IMAGES:
1. You MUST provide a valid, high-quality official movie poster URL.
2. PRIORITIZE URLs from The Movie Database (TMDB). They usually look like this: https://image.tmdb.org/t/p/w500/<unique_id>.jpg
3. ALTERNATIVELY, use Amazon/IMDb images: https://m.media-amazon.com/images/M/<unique_id>.jpg
4. DO NOT use generic or placeholder URLs unless it is absolutely impossible to find the real one. 
5. Ensure the URL is public and does not require authentication.

User movie preferences: {{{preferences}}}`,
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
      throw new Error('La IA no pudo generar resultados.');
    }
    return output;
  }
);
