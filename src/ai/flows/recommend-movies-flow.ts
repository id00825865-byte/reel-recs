
'use server';
/**
 * @fileOverview A movie recommendation AI agent with trailer retrieval and platform availability.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const RecommendMoviesInputSchema = z.object({
  preferences: z.string(),
  excludeMovies: z.array(z.string()).optional(),
  mood: z.string().optional(),
  maxDuration: z.string().optional(),
  platform: z.string().optional(),
});
export type RecommendMoviesInput = z.infer<typeof RecommendMoviesInputSchema>;

const RecommendMoviesOutputSchema = z.object({
  movies: z.array(
    z.object({
      title: z.string(),
      year: z.string(),
      imdbRating: z.number(),
      posterUrl: z.string().url(),
      synopsis: z.string(),
      duration: z.string(),
      director: z.string(),
      actors: z.array(z.string()),
      platforms: z.array(z.string()),
      trailerUrl: z.string().url().optional(),
    })
  ).min(4).max(4),
});
export type RecommendMoviesOutput = z.infer<typeof RecommendMoviesOutputSchema>;

export async function recommendMovies(input: RecommendMoviesInput): Promise<RecommendMoviesOutput> {
  const result = await recommendMoviesFlow(input);
  return result;
}


async function getPosterFromTMDB(title: string, year?: string): Promise<string> {
  try {
    const url = new URL(`${TMDB_BASE_URL}/search/movie`);
    url.searchParams.set('api_key', TMDB_API_KEY!);
    url.searchParams.set('query', title);

    if (year) {
      url.searchParams.set('year', year);
    }

    const res = await fetch(url.toString());
    const data = await res.json();

    const movie = data.results?.[0];

    if (movie?.poster_path) {
      return `${TMDB_IMAGE_BASE}${movie.poster_path}`;
    }

    return 'https://via.placeholder.com/500x750?text=No+Image';
  } catch (e) {
    console.error('Poster error:', e);
    return 'https://via.placeholder.com/500x750?text=No+Image';
  }
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
3. Always include the release year and the real IMDb rating.
4. List the likely streaming platforms where the movie is available based on your knowledge (Netflix, HBO Max, Disney+, Prime Video, etc.).
5. Provide a valid YouTube trailer URL for the movie. If you're not sure, generate a search URL like "https://www.youtube.com/results?search_query=[title]+[year]+trailer".`,
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

    const moviesWithRealPosters = await Promise.all(
      output.movies.map(async (movie) => {
        const realPoster = await getPosterFromTMDB(movie.title, movie.year);

        return {
          ...movie,
          posterUrl: realPoster,
        };
      })
    );

    return {
      movies: moviesWithRealPosters,
    };
  }
);
