import { BadgeCard } from './BadgeCard';

interface BadgeGridProps {
  badges: any[];
  earnedBadgeIds: string[];
}

export function BadgeGrid({ badges, earnedBadgeIds }: BadgeGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {badges.map((badge) => (
        <BadgeCard 
          key={badge.id}
          badge={badge}
          earned={earnedBadgeIds.includes(badge.id)}
        />
      ))}
    </div>
  );
}
