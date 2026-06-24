'use server';
/**
 * @fileOverview A movie recommendation AI agent optimized for reliability.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const maxDuration = 60;

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

const GeminiOutputSchema = z.object({
  movies: z.array(
    z.object({
      title: z.string(),
      year: z.string(),
    })
  ).min(3).max(6),
});

export async function recommendMovies(
  input: RecommendMoviesInput
): Promise<RecommendMoviesOutput> {
  try {
    return await recommendMoviesFlow(input);
  } catch (error: any) {
    console.error('Error in recommendMovies server action:', error);
    throw new Error(
      error.message || 'Error al generar recomendaciones.'
    );
  }
}

async function generateRecommendationsWithRetry(
  input: RecommendMoviesInput,
  retries = 3
) {
  let lastError;

  for (let i = 0; i < retries; i++) {
    try {
      const result = await prompt(input);

      if (result.output?.movies?.length) {
        return result.output;
      }
    } catch (error) {
      lastError = error;

      console.log(
        `Intento ${i + 1} fallido. Reintentando...`
      );
    }
  }

  throw lastError || new Error('Gemini failed');
}

async function getMovieDetails(
  title: string,
  year?: string
) {
  const fallbackPoster = `https://picsum.photos/seed/${encodeURIComponent(
    title
  )}/500/750`;

  if (!TMDB_API_KEY || TMDB_API_KEY === 'tu_tmdb_api_key_aqui') {
    return {
      title,
      year: year || '',
      imdbRating: 0,
      posterUrl: fallbackPoster,
      synopsis: 'No synopsis available.',
      duration: 'Unknown',
      director: 'Unknown',
      actors: [],
      platforms: [],
      trailerUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(
        title + ' official trailer'
      )}`,
    };
  }

  try {
    const searchUrl = new URL(
      `${TMDB_BASE_URL}/search/movie`
    );

    searchUrl.searchParams.set(
      'api_key',
      TMDB_API_KEY
    );

    searchUrl.searchParams.set(
      'query',
      title
    );

    if (year) {
      searchUrl.searchParams.set(
        'year',
        year
      );
    }

    const searchRes = await fetch(
      searchUrl.toString(),
      {
        next: {revalidate: 3600},
      }
    );

    const searchData =
      await searchRes.json();

    const movie =
      searchData.results?.[0];

    if (!movie) {
      throw new Error(
        'Movie not found'
      );
    }

    const detailsRes = await fetch(
      `${TMDB_BASE_URL}/movie/${movie.id}?api_key=${TMDB_API_KEY}&append_to_response=credits`,
      {
        next: {revalidate: 3600},
      }
    );

    const details =
      await detailsRes.json();

    const director =
      details.credits?.crew?.find(
        (person: any) =>
          person.job === 'Director'
      )?.name || 'Unknown';

    return {
      title: movie.title,
      year:
        movie.release_date?.slice(
          0,
          4
        ) ||
        year ||
        '',
      imdbRating: Number(
        (
          details.vote_average || 0
        ).toFixed(1)
      ),
      posterUrl: movie.poster_path
        ? `${TMDB_IMAGE_BASE}${movie.poster_path}`
        : fallbackPoster,
      synopsis:
        movie.overview ||
        'No synopsis available.',
      duration: details.runtime
        ? `${details.runtime} min`
        : 'Unknown',
      director,
      actors:
        details.credits?.cast
          ?.slice(0, 5)
          ?.map(
            (actor: any) =>
              actor.name
          ) || [],
      platforms: [],
      trailerUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(
        movie.title +
          ' official trailer'
      )}`,
    };
  } catch (error) {
    console.error(error);

    return {
      title,
      year: year || '',
      imdbRating: 0,
      posterUrl: fallbackPoster,
      synopsis: 'No synopsis available.',
      duration: 'Unknown',
      director: 'Unknown',
      actors: [],
      platforms: [],
      trailerUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(
        title + ' official trailer'
      )}`,
    };
  }
}

const prompt = ai.definePrompt({
  name: 'recommendMoviesPrompt',
  input: {
    schema:
      RecommendMoviesInputSchema,
  },
  output: {
    schema: GeminiOutputSchema,
  },
  prompt: `You are an expert movie recommendation system.

Return EXACTLY 4 movies.

For each movie return ONLY:

- title
- year

USER PREFERENCES:
{{{preferences}}}

{{#if mood}}
CURRENT MOOD:
{{{mood}}}
{{/if}}

{{#if maxDuration}}
MAX DURATION:
{{{maxDuration}}}
{{/if}}

{{#if platform}}
PLATFORM:
{{{platform}}}
{{/if}}

{{#if excludeMovies}}
DO NOT RECOMMEND:
{{#each excludeMovies}}
- {{{this}}}
{{/each}}
{{/if}}
`,
});

const recommendMoviesFlow =
  ai.defineFlow(
    {
      name:
        'recommendMoviesFlow',
      inputSchema:
        RecommendMoviesInputSchema,
      outputSchema:
        RecommendMoviesOutputSchema,
    },
    async input => {
      const output =
        await generateRecommendationsWithRetry(
          input
        );

      const movies =
        await Promise.all(
          output.movies
            .slice(0, 4)
            .map(movie =>
              getMovieDetails(
                movie.title,
                movie.year
              )
            )
        );

      return {
        movies,
      };
    }
  );
