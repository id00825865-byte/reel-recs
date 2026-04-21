# Checkpoint V3 - Estado Estable y Funcional (Referencia Máxima)

Este documento marca el punto de guardado solicitado tras restaurar la estabilidad de las estrellas y los metadatos de las películas.

## Funcionalidades en Estado Óptimo:
1. **Calificación por Estrellas**: Sistema de 1 a 5 (con medias estrellas) totalmente funcional y persistente.
2. **Recomendaciones de IA**:
   - Devuelve exactamente 4 películas.
   - Incluye: Año de estreno, Calificación IMDb, Sinopsis, Director, Actores Principales y Duración.
3. **Filtros de Búsqueda**:
   - **Etiquetas**: Todos los desplegables tienen su indicativo encima (Estado de Ánimo, Duración, Plataforma).
   - **Opciones**: Se ha incluido la opción de "Películas largas (+2h)".
   - **Plataformas**: Netflix, Disney+, HBO Max, Prime Video, Apple TV+.
4. **Tarjetas de Películas**:
   - Diseño limpio con el año junto al título.
   - Medalla (badge) de IMDb con la nota real.
   - Lista de actores visibles con icono de grupo.
   - Iconos para director y duración.

## Estructura de Datos (Firestore):
- `/users/{userId}/watchedMovies/{movieId}`
- `/users/{userId}/watchlist/{movieId}`

**Estado**: Punto de restauración crítico. No modificar lógica de estrellas ni filtros sin consulta previa.
**Fecha**: Mayo 2024
