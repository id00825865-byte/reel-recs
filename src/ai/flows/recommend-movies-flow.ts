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
        posterUrl: z.string().url().describe('A URL to the movie poster image.'),
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
    // Verificar si la API Key está configurada antes de llamar al flujo
    if (!process.env.GOOGLE_GENAI_API_KEY) {
      throw new Error('MISSING_API_KEY');
    }

    const result = await recommendMoviesFlow(input);
    return result;
  } catch (error: any) {
    console.error('Error detallado en recommendMovies:', error);
    
    // Errores específicos de API Key
    if (error.message === 'MISSING_API_KEY' || error.message?.includes('API_KEY_INVALID') || error.message?.includes('403')) {
      throw new Error('CONFIG_ERROR: No se encontró una clave API de Gemini válida. Por favor, configúrala en el archivo .env como GOOGLE_GENAI_API_KEY.');
    }
    
    // Error genérico pero con más información
    throw new Error('No pudimos obtener recomendaciones. Esto puede deberse a un problema de conexión con Gemini o a que se han superado los límites de uso gratuito.');
  }
}

const prompt = ai.definePrompt({
  name: 'recommendMoviesPrompt',
  input: {schema: RecommendMoviesInputSchema},
  output: {schema: RecommendMoviesOutputSchema},
  prompt: `You are an expert movie recommender. Your task is to analyze the user's preferences and provide at least three highly relevant movie recommendations.

For each movie:
- Provide the title.
- Provide a valid URL to a movie poster. Use URLs from trusted sources like m.media-amazon.com or image.tmdb.org.
- If you are unsure of a real poster URL, use: https://picsum.photos/seed/{{title}}/600/900
- Provide a concise and engaging synopsis.
- Provide the director and main cast.

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
      throw new Error('El modelo de IA no devolvió resultados válidos.');
    }
    return output;
  }
);
