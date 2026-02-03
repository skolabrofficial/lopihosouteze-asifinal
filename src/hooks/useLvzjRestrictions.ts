import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LvzjRestriction {
  id: string;
  command_name: string;
  allowed_roles: string[];
  description: string | null;
  is_active: boolean;
}

// Default restrictions for when table doesn't exist yet
const defaultRestrictions: LvzjRestriction[] = [
  { id: '1', command_name: 'melodie', allowed_roles: ['hudebnik'], description: 'Vkládání hudby (YouTube, Spotify)', is_active: true },
  { id: '2', command_name: 'playlist', allowed_roles: ['hudebnik'], description: 'Vytváření playlistů', is_active: true },
];

export function useLvzjRestrictions() {
  const [restrictions, setRestrictions] = useState<LvzjRestriction[]>(defaultRestrictions);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRestrictions();
  }, []);

  const fetchRestrictions = async () => {
    try {
      // Use raw query since table might not exist in types yet
      const { data, error } = await supabase
        .rpc('get_lvzj_restrictions' as any)
        .select('*');

      // Fallback to direct table access with type casting
      if (error) {
        const result = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/lvzj_command_restrictions?is_active=eq.true`, {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          }
        });
        if (result.ok) {
          const jsonData = await result.json();
          if (Array.isArray(jsonData)) {
            setRestrictions(jsonData);
          }
        }
      } else if (data) {
        setRestrictions(data as LvzjRestriction[]);
      }
    } catch (e) {
      // Table might not exist yet, use defaults
      console.log('Using default LvZJ restrictions');
    }
    setLoading(false);
  };

  const getRestrictedRoles = (commandName: string): string[] => {
    const restriction = restrictions.find(r => r.command_name === commandName);
    return restriction?.allowed_roles || [];
  };

  const hasAccess = (commandName: string, userRoles: string[]): boolean => {
    // Organizer can do everything
    if (userRoles.includes('organizer')) return true;
    
    const allowedRoles = getRestrictedRoles(commandName);
    if (allowedRoles.length === 0) return true; // No restriction = everyone can use
    
    return allowedRoles.some(role => userRoles.includes(role));
  };

  return { restrictions, loading, getRestrictedRoles, hasAccess, refetch: fetchRestrictions };
}

// Export for use in LvZJ parser without hook
export async function fetchLvzjRestrictionsOnce(): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  
  // Add defaults
  defaultRestrictions.forEach(r => map.set(r.command_name, r.allowed_roles));
  
  try {
    const result = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/lvzj_command_restrictions?is_active=eq.true`, {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      }
    });
    if (result.ok) {
      const data = await result.json();
      if (Array.isArray(data)) {
        data.forEach((r: any) => map.set(r.command_name, r.allowed_roles || []));
      }
    }
  } catch (e) {
    // Table might not exist
  }
  
  return map;
}
