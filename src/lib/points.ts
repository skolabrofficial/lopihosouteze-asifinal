// Utility functions for calculating points based on ratings

export interface RatingStats {
  averageRating: number | null;
  totalRatings: number;
  suggestedPoints: number;
  ratingDistribution: Record<number, number>;
}

/**
 * Calculate rating statistics from an array of ratings
 */
export function calculateRatingStats(ratings: { rating: number }[]): RatingStats {
  if (!ratings || ratings.length === 0) {
    return {
      averageRating: null,
      totalRatings: 0,
      suggestedPoints: 0,
      ratingDistribution: {},
    };
  }

  const totalRatings = ratings.length;
  const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
  const averageRating = sum / totalRatings;

  // Calculate distribution
  const ratingDistribution: Record<number, number> = {};
  ratings.forEach(r => {
    ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1;
  });

  // Calculate suggested points based on average rating and number of ratings
  // Formula: base points + rating bonus + participation bonus
  const suggestedPoints = calculateSuggestedPoints(averageRating, totalRatings);

  return {
    averageRating,
    totalRatings,
    suggestedPoints,
    ratingDistribution,
  };
}

/**
 * Calculate suggested points based on average rating and number of ratings
 * 
 * Point calculation:
 * - Base: 5 points for participation
 * - Rating bonus: (average - 5) * 3 (can be negative for low ratings)
 * - Engagement bonus: 1 point per 2 ratings (max 10 bonus)
 * - Minimum: 0 points
 */
export function calculateSuggestedPoints(averageRating: number, totalRatings: number): number {
  const basePoints = 5;
  const ratingBonus = Math.round((averageRating - 5) * 3);
  const engagementBonus = Math.min(10, Math.floor(totalRatings / 2));
  
  const total = basePoints + ratingBonus + engagementBonus;
  return Math.max(0, total);
}

/**
 * Get a text description of the rating quality
 */
export function getRatingQuality(averageRating: number | null): {
  label: string;
  color: string;
} {
  if (averageRating === null) {
    return { label: 'Bez hodnocení', color: 'text-muted-foreground' };
  }

  if (averageRating >= 9) {
    return { label: 'Výborné', color: 'text-success' };
  } else if (averageRating >= 7) {
    return { label: 'Velmi dobré', color: 'text-blue-500' };
  } else if (averageRating >= 5) {
    return { label: 'Dobré', color: 'text-primary' };
  } else if (averageRating >= 3) {
    return { label: 'Průměrné', color: 'text-yellow-500' };
  } else {
    return { label: 'Slabé', color: 'text-destructive' };
  }
}
