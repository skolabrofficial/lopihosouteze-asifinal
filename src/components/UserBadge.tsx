import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Music, ShoppingBag } from 'lucide-react';
import AlikCrown, { hasAlikRoles } from './AlikCrown';

interface UserBadgeProps {
  username: string;
  roles?: string[];
  className?: string;
  showAt?: boolean;
  linkToProfile?: boolean;
}

// Helper function to get role display info
export const getRoleDisplayName = (role: string): string => {
  switch (role) {
    case 'organizer':
      return 'Administrátor';
    case 'helper':
      return 'Pomocníček';
    case 'veverka':
      return 'Veverka';
    case 'hudebnik':
      return 'Hudebník';
    case 'vedouci_prodejny':
      return 'Vedoucí prodejny';
    case 'alik_admin':
      return 'Zvěrolékař Alíka';
    case 'alik_helper':
      return 'Správce Alíka';
    case 'alik_editor':
      return 'Redaktor Alíka';
    case 'alik_club_manager':
      return 'Správce klubovny';
    case 'alik_board_manager':
      return 'Správce nástěnek';
    case 'alik_jester':
      return 'Alíkův šašek';
    case 'user':
      return 'Uživatel';
    default:
      return role;
  }
};

export const getRoleBadgeColor = (role: string): string => {
  switch (role) {
    case 'organizer':
      return 'bg-primary text-primary-foreground';
    case 'helper':
      return 'bg-accent text-accent-foreground';
    case 'veverka':
      return 'bg-amber-600 text-white';
    case 'hudebnik':
      return 'bg-purple-500 text-white';
    case 'vedouci_prodejny':
      return 'bg-emerald-500 text-white';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

// Crown component for organizer/helper (LS internal roles)
const Crown = ({ color }: { color: 'orange' | 'pink' }) => (
  <svg
    viewBox="0 0 24 24"
    className={cn(
      "w-4 h-4 inline-block ml-1",
      color === 'orange' ? 'text-primary' : 'text-pink-400'
    )}
    fill="currentColor"
  >
    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
  </svg>
);

// Squirrel icon for Veverka (redakce)
const Squirrel = () => (
  <svg
    viewBox="0 0 24 24"
    className="w-4 h-4 inline-block ml-1 text-amber-600"
    fill="currentColor"
  >
    <path d="M12 2C9.5 2 7.4 3.7 6.8 6c-.3 1-.4 2.1-.3 3.2.1 1.1.4 2.2.9 3.2-1.5.4-2.6 1.7-2.8 3.3-.2 1.6.5 3.2 1.9 4.1.9.6 1.9.9 2.9.8 1-.1 2-.5 2.7-1.2.7.7 1.7 1.1 2.7 1.2 1 .1 2-.2 2.9-.8 1.4-.9 2.1-2.5 1.9-4.1-.2-1.6-1.3-2.9-2.8-3.3.5-1 .8-2.1.9-3.2.1-1.1 0-2.2-.3-3.2-.6-2.3-2.7-4-5.2-4zm-2 4c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1zm4 0c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1zm-2 3c1.1 0 2 .4 2.7 1-.4.3-.8.7-1.1 1.2-.4-.1-.9-.2-1.6-.2s-1.2.1-1.6.2c-.3-.5-.7-.9-1.1-1.2.7-.6 1.6-1 2.7-1z"/>
  </svg>
);

// Note icon for Hudebník
const MusicNote = () => (
  <Music className="w-4 h-4 inline-block ml-1 text-purple-500" />
);

// Store icon for Vedoucí prodejny
const StoreIcon = () => (
  <ShoppingBag className="w-4 h-4 inline-block ml-1 text-emerald-500" />
);

export default function UserBadge({ username, roles = [], className, showAt = true, linkToProfile = true }: UserBadgeProps) {
  const isOrganizer = roles.includes('organizer');
  const isHelper = roles.includes('helper');
  const isVeverka = roles.includes('veverka');
  const isHudebnik = roles.includes('hudebnik');
  const isVedouciProdejny = roles.includes('vedouci_prodejny');

  const content = (
    <span className={cn("inline-flex items-center", linkToProfile && "hover:text-primary transition-colors", className)}>
      {showAt && '@'}{username}
      {/* Alík.cz roles (crowns) */}
      {hasAlikRoles(roles) && <AlikCrown roles={roles} className="ml-1" />}
      {/* LS internal roles */}
      {isOrganizer && <Crown color="orange" />}
      {isHelper && !isOrganizer && <Crown color="pink" />}
      {isVeverka && <Squirrel />}
      {isHudebnik && <MusicNote />}
      {isVedouciProdejny && <StoreIcon />}
    </span>
  );

  if (linkToProfile) {
    return <Link to={`/u/${username}`}>{content}</Link>;
  }

  return content;
}
