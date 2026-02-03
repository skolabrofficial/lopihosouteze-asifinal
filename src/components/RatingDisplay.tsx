import { RatingStats, getRatingQuality } from '@/lib/points';
import { Progress } from '@/components/ui/progress';
import { Star } from 'lucide-react';

interface RatingDisplayProps {
  stats: RatingStats;
  showDistribution?: boolean;
  compact?: boolean;
}

export default function RatingDisplay({ stats, showDistribution = false, compact = false }: RatingDisplayProps) {
  const quality = getRatingQuality(stats.averageRating);

  if (stats.averageRating === null) {
    return (
      <div className="text-sm text-muted-foreground">
        Zatím bez hodnocení
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Star className="w-4 h-4 fill-primary text-primary" />
        <span className="font-semibold">{stats.averageRating.toFixed(1)}</span>
        <span className="text-muted-foreground text-sm">({stats.totalRatings}×)</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 fill-primary text-primary" />
          <span className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</span>
          <span className="text-muted-foreground">/10</span>
        </div>
        <div className="text-right">
          <p className={`font-medium ${quality.color}`}>{quality.label}</p>
          <p className="text-sm text-muted-foreground">{stats.totalRatings} hodnocení</p>
        </div>
      </div>

      {showDistribution && stats.totalRatings > 0 && (
        <div className="space-y-1">
          {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((rating) => {
            const count = stats.ratingDistribution[rating] || 0;
            const percentage = (count / stats.totalRatings) * 100;
            
            return (
              <div key={rating} className="flex items-center gap-2 text-sm">
                <span className="w-6 text-right text-muted-foreground">{rating}</span>
                <Progress value={percentage} className="h-2 flex-1" />
                <span className="w-8 text-right text-muted-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
