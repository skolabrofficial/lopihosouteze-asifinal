import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Import crown images
import crownBlue from '@/assets/crowns/korunka-modra.png';
import crownGreen from '@/assets/crowns/korunka-zelena.png';
import crownRed001 from '@/assets/crowns/korunka-cervena-001.png';
import crownRed010 from '@/assets/crowns/korunka-cervena-010.png';
import crownRed011 from '@/assets/crowns/korunka-cervena-011.png';
import crownRed100 from '@/assets/crowns/korunka-cervena-100.png';
import crownRed101 from '@/assets/crowns/korunka-cervena-101.png';
import crownRed110 from '@/assets/crowns/korunka-cervena-110.png';
import crownRed111 from '@/assets/crowns/korunka-cervena-111.png';

interface AlikCrownProps {
  roles: string[];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// Map red crown combinations to images
const getRedCrownImage = (editor: boolean, club: boolean, board: boolean): string | null => {
  const code = `${editor ? '1' : '0'}${club ? '1' : '0'}${board ? '1' : '0'}`;
  
  switch (code) {
    case '001': return crownRed001;
    case '010': return crownRed010;
    case '011': return crownRed011;
    case '100': return crownRed100;
    case '101': return crownRed101;
    case '110': return crownRed110;
    case '111': return crownRed111;
    default: return null;
  }
};

// Get role description for tooltip
const getRoleDescriptions = (roles: string[]): string[] => {
  const descriptions: string[] = [];
  
  if (roles.includes('alik_admin')) descriptions.push('Zvěrolékař Alíka');
  if (roles.includes('alik_helper')) descriptions.push('Správce Alíka');
  if (roles.includes('alik_jester')) descriptions.push('Alíkův šašek');
  if (roles.includes('alik_editor')) descriptions.push('Redaktor Alíka');
  if (roles.includes('alik_club_manager')) descriptions.push('Správce klubovny');
  if (roles.includes('alik_board_manager')) descriptions.push('Správce nástěnek');
  
  return descriptions;
};

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export default function AlikCrown({ roles, className, size = 'sm' }: AlikCrownProps) {
  const crowns: { src: string; alt: string; priority: number }[] = [];
  
  const isAlikAdmin = roles.includes('alik_admin');
  const isAlikHelper = roles.includes('alik_helper');
  const isAlikEditor = roles.includes('alik_editor');
  const isAlikClubManager = roles.includes('alik_club_manager');
  const isAlikBoardManager = roles.includes('alik_board_manager');
  // const isAlikJester = roles.includes('alik_jester');
  
  // Blue crown (highest priority - admin)
  if (isAlikAdmin) {
    crowns.push({ src: crownBlue, alt: 'Zvěrolékař Alíka', priority: 1 });
  }
  
  // Green crown (helper)
  if (isAlikHelper && !isAlikAdmin) {
    crowns.push({ src: crownGreen, alt: 'Správce Alíka', priority: 2 });
  }
  
  // Red crown (editorial roles)
  const hasRedRole = isAlikEditor || isAlikClubManager || isAlikBoardManager;
  if (hasRedRole) {
    const redCrown = getRedCrownImage(isAlikEditor, isAlikClubManager, isAlikBoardManager);
    if (redCrown) {
      const redRoles: string[] = [];
      if (isAlikEditor) redRoles.push('Redaktor');
      if (isAlikClubManager) redRoles.push('Správce klubovny');
      if (isAlikBoardManager) redRoles.push('Správce nástěnek');
      crowns.push({ src: redCrown, alt: redRoles.join(', '), priority: 3 });
    }
  }
  
  // TODO: Jester crown when image is provided
  // if (isAlikJester) {
  //   crowns.push({ src: crownJester, alt: 'Alíkův šašek', priority: 4 });
  // }
  
  if (crowns.length === 0) return null;
  
  const descriptions = getRoleDescriptions(roles);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex items-center gap-0.5", className)}>
            {crowns.map((crown, index) => (
              <img
                key={index}
                src={crown.src}
                alt={crown.alt}
                className={cn(sizeClasses[size], "inline-block")}
              />
            ))}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            {descriptions.map((desc, i) => (
              <div key={i}>{desc}</div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Check if user has any Alík roles
export function hasAlikRoles(roles: string[]): boolean {
  return roles.some(r => r.startsWith('alik_'));
}
