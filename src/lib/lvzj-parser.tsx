import React, { useState, useEffect, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Music, List, Lock } from 'lucide-react';
import DOMPurify from 'dompurify';

// LvZJ - Lopiho značkovací jazyk
// Based on Alíkův značkovací jazyk

// Context for user roles - allows role-based command restrictions
interface LvZJContextType {
  userRoles: string[];
}

const LvZJContext = createContext<LvZJContextType>({ userRoles: [] });

export const LvZJProvider = ({ children, userRoles }: { children: React.ReactNode; userRoles: string[] }) => (
  <LvZJContext.Provider value={{ userRoles }}>{children}</LvZJContext.Provider>
);

// Command restrictions - can be overridden from database
// Format: { commandName: allowedRoles[] }
const defaultCommandRestrictions: Record<string, string[]> = {
  'melodie': ['hudebnik'],
  'playlist': ['hudebnik'],
};

// Store for dynamic restrictions (loaded from database)
let dynamicRestrictions: Record<string, string[]> = {};

// Function to update restrictions from database
export function setLvzjRestrictions(restrictions: Record<string, string[]>) {
  dynamicRestrictions = restrictions;
}

// Check if user has permission for a command
export const hasPermission = (commandName: string, userRoles: string[]): boolean => {
  // Organizátor může všechno
  if (userRoles.includes('organizer')) return true;
  
  // Get allowed roles for this command
  const allowedRoles = dynamicRestrictions[commandName] || defaultCommandRestrictions[commandName];
  
  // If no restriction exists, everyone can use it
  if (!allowedRoles || allowedRoles.length === 0) return true;
  
  // Check if user has any of the required roles
  return allowedRoles.some(role => userRoles.includes(role));
};

interface ParseResult {
  content: React.ReactNode;
}

// Countdown component
const Countdown = ({ targetDate, countUp = false, verbose = false }: { targetDate: Date; countUp?: boolean; verbose?: boolean }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const diff = countUp ? now.getTime() - targetDate.getTime() : targetDate.getTime() - now.getTime();
      
      if (diff < 0 && !countUp) {
        setTimeLeft(verbose ? 'Čas vypršel' : '0:00:00:00');
        return;
      }

      const absDiff = Math.abs(diff);
      const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);

      if (verbose) {
        const parts = [];
        if (days > 0) parts.push(`${days} ${days === 1 ? 'den' : days < 5 ? 'dny' : 'dní'}`);
        if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hodina' : hours < 5 ? 'hodiny' : 'hodin'}`);
        if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'minuta' : minutes < 5 ? 'minuty' : 'minut'}`);
        if (seconds > 0 || parts.length === 0) parts.push(`${seconds} ${seconds === 1 ? 'sekunda' : seconds < 5 ? 'sekundy' : 'sekund'}`);
        setTimeLeft(parts.join(', '));
      } else {
        setTimeLeft(`${days}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate, countUp, verbose]);

  return <span className="font-mono bg-muted px-2 py-0.5 rounded">{timeLeft}</span>;
};

// Spoiler component
const Spoiler = ({ children }: { children: React.ReactNode }) => {
  const [revealed, setRevealed] = useState(false);

  return (
    <span
      onClick={() => setRevealed(!revealed)}
      className={cn(
        "cursor-pointer px-1 py-0.5 rounded transition-all inline",
        revealed ? "bg-muted" : "bg-foreground text-foreground hover:bg-foreground/80"
      )}
    >
      {children}
    </span>
  );
};

// Progress bar (Žížalka) component
const ProgressBar = ({ value, max = 100, color = 'primary' }: { value: number; max?: number; color?: string }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const colorClasses: Record<string, string> = {
    primary: 'bg-primary',
    red: 'bg-red-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
    cyan: 'bg-cyan-500',
  };

  return (
    <div className="inline-flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all", colorClasses[color] || 'bg-primary')}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">{Math.round(percentage)}%</span>
    </div>
  );
};

// Collapsible box component
const Box = ({ children, title, color = 'default', align = 'left' }: { 
  children: React.ReactNode; 
  title?: string; 
  color?: string;
  align?: 'left' | 'right';
}) => {
  const colorClasses: Record<string, string> = {
    default: 'border-border bg-card',
    red: 'border-red-500/50 bg-red-500/10',
    green: 'border-green-500/50 bg-green-500/10',
    blue: 'border-blue-500/50 bg-blue-500/10',
    yellow: 'border-yellow-500/50 bg-yellow-500/10',
    orange: 'border-orange-500/50 bg-orange-500/10',
    purple: 'border-purple-500/50 bg-purple-500/10',
    pink: 'border-pink-500/50 bg-pink-500/10',
  };

  return (
    <div className={cn(
      "border rounded-lg p-4 my-2",
      colorClasses[color] || colorClasses.default,
      align === 'right' && 'float-right ml-4 max-w-xs',
      align === 'left' && 'float-left mr-4 max-w-xs'
    )}>
      {title && <div className="font-semibold mb-2">{title}</div>}
      {children}
    </div>
  );
};

// Quote component
const Quote = ({ children, author, source }: { children: React.ReactNode; author?: string; source?: string }) => (
  <blockquote className="border-l-4 border-primary pl-4 py-2 my-2 italic bg-muted/30 rounded-r">
    {children}
    {(author || source) && (
      <footer className="text-sm text-muted-foreground mt-2 not-italic">
        {author && <span>— {author}</span>}
        {source && <a href={source} className="ml-2 text-primary hover:underline" target="_blank" rel="noopener noreferrer">zdroj</a>}
      </footer>
    )}
  </blockquote>
);

// Music embed component for Hudebník
const MelodieEmbed = ({ url }: { url: string }) => {
  // Support YouTube, Spotify, SoundCloud
  const getEmbedUrl = (url: string): { type: string; embedUrl: string } | null => {
    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (youtubeMatch) {
      return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}` };
    }
    
    // Spotify track/album/playlist
    const spotifyMatch = url.match(/spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
    if (spotifyMatch) {
      return { type: 'spotify', embedUrl: `https://open.spotify.com/embed/${spotifyMatch[1]}/${spotifyMatch[2]}` };
    }
    
    // SoundCloud - just return the URL for now, would need oEmbed API
    if (url.includes('soundcloud.com')) {
      return { type: 'soundcloud', embedUrl: url };
    }
    
    return null;
  };

  const embed = getEmbedUrl(url);
  
  if (!embed) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-purple-500 hover:underline">
        <Music className="w-4 h-4" />
        <span>Přehrát melodii</span>
      </a>
    );
  }

  if (embed.type === 'youtube') {
    return (
      <div className="my-4 rounded-lg overflow-hidden shadow-lg max-w-lg">
        <iframe
          width="100%"
          height="200"
          src={embed.embedUrl}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="border-0"
        />
      </div>
    );
  }

  if (embed.type === 'spotify') {
    return (
      <div className="my-4 rounded-lg overflow-hidden shadow-lg max-w-lg">
        <iframe
          src={embed.embedUrl}
          width="100%"
          height="152"
          allow="encrypted-media"
          className="border-0"
        />
      </div>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-purple-500 hover:underline">
      <Music className="w-4 h-4" />
      <span>Přehrát melodii</span>
    </a>
  );
};

// Playlist component for Hudebník
const PlaylistEmbed = ({ items }: { items: string[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (items.length === 0) return null;

  return (
    <div className="my-4 p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
      <div className="flex items-center gap-2 mb-3">
        <List className="w-5 h-5 text-purple-500" />
        <span className="font-semibold text-purple-600 dark:text-purple-400">Playlist ({items.length} skladeb)</span>
      </div>
      <div className="space-y-2">
        {items.map((url, index) => (
          <div 
            key={index} 
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all",
              index === currentIndex ? "bg-purple-500/20" : "hover:bg-purple-500/10"
            )}
            onClick={() => setCurrentIndex(index)}
          >
            <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
            <Music className="w-4 h-4 text-purple-500" />
            <span className="text-sm truncate flex-1">{url}</span>
            {index === currentIndex && <span className="text-xs text-purple-500">▶</span>}
          </div>
        ))}
      </div>
      <div className="mt-4">
        <MelodieEmbed url={items[currentIndex]} />
      </div>
    </div>
  );
};

// Restricted content placeholder
const RestrictedContent = ({ commandName }: { commandName: string }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted/50 text-muted-foreground text-sm rounded">
    <Lock className="w-3 h-3" />
    <span className="text-xs">{commandName}</span>
  </span>
);

// Parse date from Czech format
const parseCzechDate = (dateStr: string): Date | null => {
  // Try formats: "1. 9. 2026 8:00", "1.9.2026", "1. 9. 2026"
  const patterns = [
    /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\s*(\d{1,2}):(\d{2})/,
    /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/,
  ];

  for (const pattern of patterns) {
    const match = dateStr.match(pattern);
    if (match) {
      const day = parseInt(match[1]);
      const month = parseInt(match[2]) - 1;
      const year = parseInt(match[3]);
      const hour = match[4] ? parseInt(match[4]) : 0;
      const minute = match[5] ? parseInt(match[5]) : 0;
      return new Date(year, month, day, hour, minute);
    }
  }
  return null;
};

// Color map
const colorMap: Record<string, string> = {
  'červeně': 'text-red-500',
  'červenou': 'text-red-500',
  'zeleně': 'text-green-500',
  'zelenou': 'text-green-500',
  'modře': 'text-blue-500',
  'modrou': 'text-blue-500',
  'žlutě': 'text-yellow-500',
  'žlutou': 'text-yellow-500',
  'modrozeleně': 'text-cyan-500',
  'modrozelenou': 'text-cyan-500',
  'fialově': 'text-purple-500',
  'fialovou': 'text-purple-500',
  'růžově': 'text-pink-500',
  'růžovou': 'text-pink-500',
  'hnědě': 'text-amber-700',
  'hnědou': 'text-amber-700',
  'oranžově': 'text-orange-500',
  'oranžovou': 'text-orange-500',
  'šedě': 'text-gray-500',
  'šedou': 'text-gray-500',
  'bíle': 'text-white',
  'bílou': 'text-white',
  'černě': 'text-black dark:text-white',
  'černou': 'text-black dark:text-white',
};

const highlightColorMap: Record<string, string> = {
  'červeně': 'bg-red-500/30',
  'červenou': 'bg-red-500/30',
  'zeleně': 'bg-green-500/30',
  'zelenou': 'bg-green-500/30',
  'modře': 'bg-blue-500/30',
  'modrou': 'bg-blue-500/30',
  'žlutě': 'bg-yellow-500/30',
  'žlutou': 'bg-yellow-500/30',
  'modrozeleně': 'bg-cyan-500/30',
  'modrozelenou': 'bg-cyan-500/30',
  'fialově': 'bg-purple-500/30',
  'fialovou': 'bg-purple-500/30',
  'růžově': 'bg-pink-500/30',
  'růžovou': 'bg-pink-500/30',
  'oranžově': 'bg-orange-500/30',
  'oranžovou': 'bg-orange-500/30',
};

// Parse style commands
const parseStyleCommand = (command: string): string => {
  const classes: string[] = [];
  const lowerCommand = command.toLowerCase();

  // Text styles
  if (lowerCommand.includes('tučně') || lowerCommand.includes('tučnou')) classes.push('font-bold');
  if (lowerCommand.includes('kurzív')) classes.push('italic');
  if (lowerCommand.includes('škrtnut')) classes.push('line-through');
  if (lowerCommand.includes('horní index')) classes.push('text-[0.7em] align-super');
  if (lowerCommand.includes('dolní index')) classes.push('text-[0.7em] align-sub');
  if (lowerCommand.includes('strojově')) classes.push('font-mono');
  if (lowerCommand.includes('kapitálkami')) classes.push('uppercase tracking-wide text-[0.9em]');
  if (lowerCommand.includes('psace') || lowerCommand.includes('psací')) classes.push('font-serif italic');

  // Colors
  for (const [key, value] of Object.entries(colorMap)) {
    if (lowerCommand.includes(key)) {
      classes.push(value);
      break;
    }
  }

  // Rainbow
  if (lowerCommand.includes('duhově') || lowerCommand.includes('duhovou')) {
    classes.push('bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 bg-clip-text text-transparent');
  }

  // Highlight/background
  if (lowerCommand.includes('podbarvení') || lowerCommand.includes('zvýrazn')) {
    let foundHighlight = false;
    for (const [key, value] of Object.entries(highlightColorMap)) {
      if (lowerCommand.includes(key)) {
        classes.push(value);
        foundHighlight = true;
        break;
      }
    }
    if (!foundHighlight) classes.push('bg-yellow-500/30');
  }

  return classes.join(' ');
};

// Main parser with role support
export function parseLvZJ(text: string, userRoles: string[] = []): React.ReactNode {
  if (!text) return null;

  const elements: React.ReactNode[] = [];
  let currentIndex = 0;
  let currentStyle = '';
  let keyCounter = 0;

  // Helper to add styled text
  const addText = (content: string) => {
    if (!content) return;
    if (currentStyle) {
      elements.push(<span key={keyCounter++} className={currentStyle}>{content}</span>);
    } else {
      elements.push(<React.Fragment key={keyCounter++}>{content}</React.Fragment>);
    }
  };

  // Process blocks first (spoilers, boxes, quotes, lists)
  let processedText = text;

  // Process spoilers
  processedText = processedText.replace(/\(spoiler\)([\s\S]*?)\(konec\)/gi, (_, content) => {
    return `{{SPOILER:${content}}}`;
  });

  // Process boxes
  processedText = processedText.replace(/\(boxík(?:\s+(\w+))?\)([\s\S]*?)\(konec boxíku\)/gi, (_, align, content) => {
    return `{{BOX:${align || 'default'}:${content}}}`;
  });

  // Process quotes
  processedText = processedText.replace(/\(citace(?:\s+(.+?))?\)([\s\S]*?)\(konec citace\)/gi, (_, author, content) => {
    return `{{QUOTE:${author || ''}:${content}}}`;
  });

  // Process playlist (Hudebník only)
  processedText = processedText.replace(/\(playlist\)([\s\S]*?)\(konec playlistu?\)/gi, (match, content) => {
    if (!hasPermission('playlist', userRoles)) {
      return '{{RESTRICTED:playlist}}';
    }
    const urls = content.trim().split('\n').filter((line: string) => line.trim().startsWith('http'));
    return `{{PLAYLIST:${urls.join('|||')}}}`;
  });

  // Process HTML blocks (Organizer only)
  processedText = processedText.replace(/\(html\)([\s\S]*?)\(konec html\)/gi, (match, content) => {
    if (!userRoles.includes('organizer')) {
      return '{{RESTRICTED:html}}';
    }
    // Base64 encode to prevent inner parsing
    const encoded = btoa(unescape(encodeURIComponent(content.trim())));
    return `{{HTML:${encoded}}}`;
  });

  // Split by lines for line-based processing
  const lines = processedText.split('\n');
  const processedLines: React.ReactNode[] = [];

  let inList = false;
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | 'pros-cons' = 'ul';

  const flushList = () => {
    if (listItems.length > 0) {
      if (listType === 'ol') {
        processedLines.push(
          <ol key={keyCounter++} className="list-decimal list-inside my-2 space-y-1">
            {listItems.map((item, i) => <li key={i}>{parseInline(item, userRoles)}</li>)}
          </ol>
        );
      } else if (listType === 'pros-cons') {
        processedLines.push(
          <ul key={keyCounter++} className="my-2 space-y-1">
            {listItems.map((item, i) => (
              <li key={i} className={item.startsWith('+') ? 'text-green-600' : item.startsWith('-') ? 'text-red-500' : ''}>
                {parseInline(item, userRoles)}
              </li>
            ))}
          </ul>
        );
      } else {
        processedLines.push(
          <ul key={keyCounter++} className="list-disc list-inside my-2 space-y-1">
            {listItems.map((item, i) => <li key={i}>{parseInline(item, userRoles)}</li>)}
          </ul>
        );
      }
      listItems = [];
      inList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Check for list start
    if (line.match(/\(seznam(?:\s+číslovaný)?\)/i)) {
      flushList();
      inList = true;
      listType = line.toLowerCase().includes('číslovaný') ? 'ol' : 'ul';
      if (line.toLowerCase().includes('kladů a záporů')) listType = 'pros-cons';
      continue;
    }

    // Check for list item
    if (line.trim().startsWith('- ') || line.trim().startsWith('+ ')) {
      if (!inList) {
        inList = true;
        listType = 'ul';
      }
      listItems.push(line.trim().substring(2));
      continue;
    }

    // Check for list end
    if (line.match(/\(konec\)/i) && inList) {
      flushList();
      continue;
    }

    // Not a list item, flush any pending list
    if (inList && listItems.length > 0) {
      flushList();
    }

    // Check for heading
    if (line.match(/\(nadpis\)/i)) {
      line = line.replace(/\(nadpis\)/gi, '');
      processedLines.push(<h2 key={keyCounter++} className="text-2xl font-display font-bold my-4">{parseInline(line, userRoles)}</h2>);
      continue;
    }

    if (line.match(/\(malý nadpis\)/i)) {
      line = line.replace(/\(malý nadpis\)/gi, '');
      processedLines.push(<h3 key={keyCounter++} className="text-xl font-display font-semibold my-3">{parseInline(line, userRoles)}</h3>);
      continue;
    }

    // Check for divider
    if (line.match(/\(oddělovač\)/i)) {
      processedLines.push(<hr key={keyCounter++} className="my-4 border-border" />);
      continue;
    }

    if (line.match(/\(malý oddělovač\)/i)) {
      processedLines.push(<hr key={keyCounter++} className="my-2 border-border w-1/2 mx-auto" />);
      continue;
    }

    // Check for alignment
    let alignClass = '';
    if (line.match(/\(zarovnat doprava\)/i) || line.match(/\(doprava\)/i)) {
      alignClass = 'text-right';
      line = line.replace(/\(zarovnat doprava\)/gi, '').replace(/\(doprava\)/gi, '');
    } else if (line.match(/\(doprostřed\)/i) || line.match(/\(zarovnat doprostřed\)/i)) {
      alignClass = 'text-center';
      line = line.replace(/\(doprostřed\)/gi, '').replace(/\(zarovnat doprostřed\)/gi, '');
    }

    // Process inline elements
    const parsed = parseInline(line, userRoles);
    if (alignClass) {
      processedLines.push(<p key={keyCounter++} className={alignClass}>{parsed}</p>);
    } else if (line.trim()) {
      processedLines.push(<p key={keyCounter++}>{parsed}</p>);
    } else {
      processedLines.push(<br key={keyCounter++} />);
    }
  }

  flushList();

  return <div className="lvzj-content space-y-1">{processedLines}</div>;
}

// Parse inline elements
function parseInline(text: string, userRoles: string[] = []): React.ReactNode {
  if (!text) return null;

  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyCounter = 0;
  let currentStyle = '';

  while (remaining.length > 0) {
    // Check for special placeholders
    const spoilerMatch = remaining.match(/^\{\{SPOILER:([\s\S]*?)\}\}/);
    if (spoilerMatch) {
      parts.push(<Spoiler key={keyCounter++}>{parseInline(spoilerMatch[1], userRoles)}</Spoiler>);
      remaining = remaining.substring(spoilerMatch[0].length);
      continue;
    }

    const boxMatch = remaining.match(/^\{\{BOX:(\w+):([\s\S]*?)\}\}/);
    if (boxMatch) {
      const align = boxMatch[1] === 'vpravo' ? 'right' : boxMatch[1] === 'vlevo' ? 'left' : undefined;
      parts.push(<Box key={keyCounter++} align={align}>{parseInline(boxMatch[2], userRoles)}</Box>);
      remaining = remaining.substring(boxMatch[0].length);
      continue;
    }

    const quoteMatch = remaining.match(/^\{\{QUOTE:(.*?):([\s\S]*?)\}\}/);
    if (quoteMatch) {
      parts.push(<Quote key={keyCounter++} author={quoteMatch[1] || undefined}>{parseInline(quoteMatch[2], userRoles)}</Quote>);
      remaining = remaining.substring(quoteMatch[0].length);
      continue;
    }

    // Playlist placeholder
    const playlistMatch = remaining.match(/^\{\{PLAYLIST:([\s\S]*?)\}\}/);
    if (playlistMatch) {
      const urls = playlistMatch[1].split('|||').filter(Boolean);
      parts.push(<PlaylistEmbed key={keyCounter++} items={urls} />);
      remaining = remaining.substring(playlistMatch[0].length);
      continue;
    }

    // HTML placeholder (organizer only)
    const htmlMatch = remaining.match(/^\{\{HTML:([\s\S]*?)\}\}/);
    if (htmlMatch) {
      try {
        const decoded = decodeURIComponent(escape(atob(htmlMatch[1])));
        const sanitized = DOMPurify.sanitize(decoded, {
          ALLOWED_TAGS: ['div', 'span', 'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'blockquote', 'pre', 'code', 'small', 'sub', 'sup', 'mark', 'details', 'summary', 'figure', 'figcaption', 'center'],
          ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel', 'width', 'height', 'colspan', 'rowspan'],
        });
        parts.push(
          <div key={keyCounter++} className="lvzj-html-block my-2" dangerouslySetInnerHTML={{ __html: sanitized }} />
        );
      } catch {
        parts.push(<span key={keyCounter++} className="text-destructive text-sm">[Chyba HTML]</span>);
      }
      remaining = remaining.substring(htmlMatch[0].length);
      continue;
    }

    // Restricted content placeholder
    const restrictedMatch = remaining.match(/^\{\{RESTRICTED:(\w+)\}\}/);
    if (restrictedMatch) {
      parts.push(<RestrictedContent key={keyCounter++} commandName={restrictedMatch[1]} />);
      remaining = remaining.substring(restrictedMatch[0].length);
      continue;
    }

    // Check for commands
    const commandMatch = remaining.match(/^\(([^)]+)\)/);
    if (commandMatch) {
      const command = commandMatch[1];
      const lowerCommand = command.toLowerCase();

      // Melodie (Hudebník only)
      const melodieMatch = lowerCommand.match(/melodie\s+(https?:\/\/\S+)/);
      if (melodieMatch) {
        if (hasPermission('melodie', userRoles)) {
          parts.push(<MelodieEmbed key={keyCounter++} url={melodieMatch[1]} />);
        } else {
          parts.push(<RestrictedContent key={keyCounter++} commandName="melodie" />);
        }
        remaining = remaining.substring(commandMatch[0].length);
        continue;
      }

      // Countdown
      const countdownToMatch = lowerCommand.match(/odpočet(?:\s+slovně)?\s+do\s+(.+)/);
      if (countdownToMatch) {
        const date = parseCzechDate(countdownToMatch[1]);
        if (date) {
          parts.push(<Countdown key={keyCounter++} targetDate={date} verbose={lowerCommand.includes('slovně')} />);
          remaining = remaining.substring(commandMatch[0].length);
          continue;
        }
      }

      const countdownFromMatch = lowerCommand.match(/odpočet(?:\s+slovně)?\s+od\s+(.+)/);
      if (countdownFromMatch) {
        const date = parseCzechDate(countdownFromMatch[1]);
        if (date) {
          parts.push(<Countdown key={keyCounter++} targetDate={date} countUp verbose={lowerCommand.includes('slovně')} />);
          remaining = remaining.substring(commandMatch[0].length);
          continue;
        }
      }

      // Progress bar (žížalka)
      const progressMatch = lowerCommand.match(/(\w+\s+)?žížalka\s+(\d+)\s*(?:%|\/\s*(\d+))?/);
      if (progressMatch) {
        const colorWord = progressMatch[1]?.trim();
        const value = parseInt(progressMatch[2]);
        const max = progressMatch[3] ? parseInt(progressMatch[3]) : 100;
        let color = 'primary';
        
        if (colorWord) {
          const colorLower = colorWord.toLowerCase();
          if (colorLower.includes('červen')) color = 'red';
          else if (colorLower.includes('zelen')) color = 'green';
          else if (colorLower.includes('modr')) color = 'blue';
          else if (colorLower.includes('žlut')) color = 'yellow';
          else if (colorLower.includes('oranž')) color = 'orange';
          else if (colorLower.includes('fial')) color = 'purple';
          else if (colorLower.includes('růž')) color = 'pink';
          else if (colorLower.includes('cyan') || colorLower.includes('modrozelen')) color = 'cyan';
        }

        parts.push(<ProgressBar key={keyCounter++} value={value} max={max} color={color} />);
        remaining = remaining.substring(commandMatch[0].length);
        continue;
      }

      // Link
      const linkMatch = lowerCommand.match(/odkaz\s+na\s+(https?:\/\/\S+)/);
      if (linkMatch) {
        // Find the end of link
        const endMatch = remaining.substring(commandMatch[0].length).match(/([\s\S]*?)\(konec(?:\s+odkazu)?\)/i);
        if (endMatch) {
          parts.push(
            <a key={keyCounter++} href={linkMatch[1]} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              {parseInline(endMatch[1], userRoles)}
            </a>
          );
          remaining = remaining.substring(commandMatch[0].length + endMatch[0].length);
          continue;
        }
      }

      // Reset style
      if (lowerCommand === 'obyčejně' || lowerCommand === 'normálně') {
        currentStyle = '';
        remaining = remaining.substring(commandMatch[0].length);
        continue;
      }

      // Style command
      const styleClass = parseStyleCommand(command);
      if (styleClass) {
        currentStyle = styleClass;
        remaining = remaining.substring(commandMatch[0].length);
        continue;
      }

      // Bracket escape
      if (lowerCommand === 'závorka') {
        parts.push(<React.Fragment key={keyCounter++}>(</React.Fragment>);
        remaining = remaining.substring(commandMatch[0].length);
        continue;
      }

      // Unknown command, treat as text
      if (currentStyle) {
        parts.push(<span key={keyCounter++} className={currentStyle}>(</span>);
      } else {
        parts.push(<React.Fragment key={keyCounter++}>(</React.Fragment>);
      }
      remaining = remaining.substring(1);
      continue;
    }

    // Regular text - find next command or end
    const nextCommand = remaining.search(/\(/);
    const textEnd = nextCommand === -1 ? remaining.length : nextCommand;
    const textContent = remaining.substring(0, textEnd);

    // Auto-link URLs
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    let lastUrlEnd = 0;
    let urlMatch;
    const textParts: React.ReactNode[] = [];

    while ((urlMatch = urlRegex.exec(textContent)) !== null) {
      if (urlMatch.index > lastUrlEnd) {
        const beforeText = textContent.substring(lastUrlEnd, urlMatch.index);
        if (currentStyle) {
          textParts.push(<span key={keyCounter++} className={currentStyle}>{beforeText}</span>);
        } else {
          textParts.push(<React.Fragment key={keyCounter++}>{beforeText}</React.Fragment>);
        }
      }
      textParts.push(
        <a key={keyCounter++} href={urlMatch[1]} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
          {urlMatch[1]}
        </a>
      );
      lastUrlEnd = urlMatch.index + urlMatch[0].length;
    }

    if (lastUrlEnd < textContent.length) {
      const afterText = textContent.substring(lastUrlEnd);
      if (currentStyle) {
        textParts.push(<span key={keyCounter++} className={currentStyle}>{afterText}</span>);
      } else {
        textParts.push(<React.Fragment key={keyCounter++}>{afterText}</React.Fragment>);
      }
    }

    if (textParts.length > 0) {
      parts.push(...textParts);
    } else if (textContent) {
      if (currentStyle) {
        parts.push(<span key={keyCounter++} className={currentStyle}>{textContent}</span>);
      } else {
        parts.push(<React.Fragment key={keyCounter++}>{textContent}</React.Fragment>);
      }
    }

    remaining = remaining.substring(textEnd);
  }

  return <>{parts}</>;
}

// Component for rendering LvZJ content with role support
export function LvZJContent({ content, className, userRoles = [] }: { content: string; className?: string; userRoles?: string[] }) {
  return <div className={cn("lvzj-content", className)}>{parseLvZJ(content, userRoles)}</div>;
}
