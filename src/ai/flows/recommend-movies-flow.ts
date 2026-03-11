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
  apiKey: z.string().optional().describe('Optional manual API key provided by the user.'),
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
    const keyToUse = input.apiKey || process.env.GOOGLE_GENAI_API_KEY;

    if (!keyToUse || keyToUse === 'TU_CLAVE_AQUI' || keyToUse === 'PEGAR_AQUI_TU_CODIGO_AIza') {
      throw new Error('MISSING_API_KEY');
    }

    // Configurar la API Key dinámicamente si se proporciona manualmente
    // Nota: En un entorno real de Genkit, esto se manejaría mediante el plugin,
    // aquí asumimos que el entorno o el input proporcionan la clave válida.
    if (input.apiKey) {
      process.env.GOOGLE_GENAI_API_KEY = input.apiKey;
    }

    const result = await recommendMoviesFlow(input);
    return result;
  } catch (error: any) {
    console.error('Error detallado en recommendMovies:', error);
    
    if (error.message === 'MISSING_API_KEY' || error.message?.includes('API_KEY_INVALID') || error.message?.includes('403')) {
      throw new Error('CONFIG_ERROR: No se encontró una clave API válida.');
    }
    
    throw new Error('No pudimos obtener recomendaciones. Verifica tu clave API o conexión.');
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
