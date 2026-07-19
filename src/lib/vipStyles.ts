// VIP Style Helper - Ensures consistent styling across all components

export interface VIPUser {
  isVIP?: boolean;
  isFounder?: boolean;
  vipNameColor?: string;
  vipBadge?: string;
  vipGlow?: boolean;
  vipNameEffect?: string;
  vipNameGradient?: string;
  vipFont?: string;
}

export const getVIPStyles = (user: VIPUser, isDarkMode: boolean = false) => {
  const defaultColor = isDarkMode ? 'white' : 'black';
  
  // Founder gets special styling
  if (user.isFounder) {
    return {
      nameColor: undefined, // Uses gradient
      nameGradient: 'linear-gradient(90deg, #a855f7, #ec4899, #a855f7)',
      textShadow: '0 0 20px rgba(168,85,247,0.8), 0 0 40px rgba(168,85,247,0.4)',
      badge: '👑',
      glowColor: '#a855f7',
      borderColor: '#a855f7',
      bgGradient: 'linear-gradient(145deg, rgba(124,58,237,0.2) 0%, rgba(219,39,119,0.2) 100%)',
      isAnimated: true,
      fontFamily: 'inherit',
    };
  }
  
  // VIP styling
  if (user.isVIP) {
    const nameColor = user.vipNameColor || '#FFD700';
    return {
      nameColor: user.vipNameGradient ? undefined : nameColor,
      nameGradient: user.vipNameGradient ? `linear-gradient(90deg, ${user.vipNameGradient})` : undefined,
      textShadow: user.vipGlow ? `0 0 8px ${nameColor}, 0 0 16px ${nameColor}` : 'none',
      badge: user.vipBadge || '⭐',
      glowColor: nameColor,
      borderColor: '#fbbf24',
      bgGradient: `linear-gradient(145deg, ${nameColor}22 0%, ${nameColor}11 100%)`,
      isAnimated: user.vipNameEffect === 'pulse' || user.vipNameEffect === 'rainbow',
      fontFamily: getFontFamily(user.vipFont),
    };
  }
  
  // Normal user
  return {
    nameColor: defaultColor,
    nameGradient: undefined,
    textShadow: 'none',
    badge: undefined,
    glowColor: undefined,
    borderColor: isDarkMode ? '#333' : 'black',
    bgGradient: undefined,
    isAnimated: false,
    fontFamily: 'inherit',
  };
};

export const getFontFamily = (font?: string): string => {
  switch (font) {
    case 'mono': return 'monospace';
    case 'serif': return 'serif';
    case 'cursive': return 'cursive';
    case 'fantasy': return 'fantasy';
    case 'comic': return '"Comic Sans MS", cursive';
    default: return 'inherit';
  }
};

export const getVIPNameStyle = (user: VIPUser, isDarkMode: boolean = false): React.CSSProperties => {
  const styles = getVIPStyles(user, isDarkMode);
  
  if (styles.nameGradient) {
    return {
      background: styles.nameGradient,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      textShadow: styles.textShadow,
      fontFamily: styles.fontFamily,
    } as React.CSSProperties;
  }
  
  return {
    color: styles.nameColor,
    textShadow: styles.textShadow,
    fontFamily: styles.fontFamily,
  };
};

export const getVIPBadge = (user: VIPUser): string | undefined => {
  if (user.isFounder) return '👑';
  if (user.isVIP) return user.vipBadge || '⭐';
  return undefined;
};

export const getVIPTitle = (user: VIPUser, role?: string): string => {
  if (user.isFounder) return '👑 Founder';
  if (role === 'PURR_ADMIN') return 'PuRRRRRFect Admin'; // Will be styled with rainbow colors
  if (user.isVIP) return '⭐ VIP Member';
  if (role === 'admin' || role === 'ADMIN') return '🛡️ Admin';
  return 'Member';
};

// CSS class for animated name effects
export const getVIPAnimationClass = (user: VIPUser): string => {
  if (user.isFounder) return 'animate-pulse';
  if (user.isVIP && user.vipNameEffect) {
    switch (user.vipNameEffect) {
      case 'rainbow': return 'animate-rainbow';
      case 'wave': return 'animate-wave';
      case 'pulse': return 'animate-pulse';
      case 'sparkle': return 'animate-sparkle';
      case 'glitch': return 'animate-glitch';
      default: return '';
    }
  }
  return '';
};
