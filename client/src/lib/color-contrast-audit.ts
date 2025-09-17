// Color contrast audit and WCAG AA compliance checker
import { getContrastRatio } from './accessibility-utils';

// School in the Square brand colors for WCAG AA compliance testing
export const BRAND_COLORS = {
  // Primary colors
  schoolBlue: {
    main: '#2563eb',      // hsl(217 91% 60%)
    dark: '#1d4ed8',      // hsl(217 91% 50%) - darker for better contrast
    light: '#3b82f6',     // hsl(217 91% 70%) - lighter for dark mode
    50: '#eff6ff',        // Very light blue
    100: '#dbeafe',       // Light blue
    500: '#2563eb',       // Main blue
    600: '#1d4ed8',       // Dark blue
    900: '#1e3a8a'        // Very dark blue
  },
  schoolGold: {
    main: '#f59e0b',      // hsl(38 92% 50%)
    dark: '#d97706',      // hsl(38 92% 45%) - darker for better contrast
    light: '#fbbf24',     // hsl(38 92% 60%) - lighter for dark mode
    50: '#fffbeb',        // Very light gold
    100: '#fef3c7',       // Light gold
    500: '#f59e0b',       // Main gold
    600: '#d97706',       // Dark gold
    900: '#92400e'        // Very dark gold
  },
  // Neutral colors
  neutral: {
    white: '#ffffff',
    black: '#000000',
    gray50: '#f9fafb',
    gray100: '#f3f4f6',
    gray200: '#e5e7eb',
    gray300: '#d1d5db',
    gray400: '#9ca3af',
    gray500: '#6b7280',
    gray600: '#4b5563',
    gray700: '#374151',
    gray800: '#1f2937',
    gray900: '#111827'
  },
  // Semantic colors
  semantic: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6'
  }
};

// WCAG AA contrast ratios
export const CONTRAST_RATIOS = {
  AA_NORMAL: 4.5,      // Large text 18pt+ or 14pt+ bold
  AA_LARGE: 3,         // Normal text
  AAA_NORMAL: 7,       // Enhanced accessibility
  AAA_LARGE: 4.5       // Enhanced accessibility large text
};

// Color combination testing for WCAG AA compliance
interface ContrastResult {
  ratio: number;
  passes: {
    AA_normal: boolean;
    AA_large: boolean;
    AAA_normal: boolean;
    AAA_large: boolean;
  };
  recommendation?: string;
}

export function testContrast(foreground: string, background: string): ContrastResult {
  const ratio = getContrastRatio(foreground, background);
  
  return {
    ratio: Math.round(ratio * 100) / 100,
    passes: {
      AA_normal: ratio >= CONTRAST_RATIOS.AA_NORMAL,
      AA_large: ratio >= CONTRAST_RATIOS.AA_LARGE,
      AAA_normal: ratio >= CONTRAST_RATIOS.AAA_NORMAL,
      AAA_large: ratio >= CONTRAST_RATIOS.AAA_LARGE
    },
    recommendation: getContrastRecommendation(ratio)
  };
}

function getContrastRecommendation(ratio: number): string {
  if (ratio >= CONTRAST_RATIOS.AAA_NORMAL) {
    return 'Excellent contrast - passes AAA standards';
  } else if (ratio >= CONTRAST_RATIOS.AA_NORMAL) {
    return 'Good contrast - passes AA standards';
  } else if (ratio >= CONTRAST_RATIOS.AA_LARGE) {
    return 'Acceptable for large text only - consider darker colors for normal text';
  } else {
    return 'Poor contrast - does not meet accessibility standards';
  }
}

// Comprehensive color audit for School in the Square theme
export function auditColorCombinations() {
  const results: Record<string, any> = {};

  // Test primary brand combinations
  results.primaryBrand = {
    schoolBlueOnWhite: testContrast(BRAND_COLORS.schoolBlue.main, BRAND_COLORS.neutral.white),
    whiteOnSchoolBlue: testContrast(BRAND_COLORS.neutral.white, BRAND_COLORS.schoolBlue.main),
    schoolGoldOnWhite: testContrast(BRAND_COLORS.schoolGold.main, BRAND_COLORS.neutral.white),
    schoolBlueOnGold: testContrast(BRAND_COLORS.schoolBlue.main, BRAND_COLORS.schoolGold.main),
    darkBlueOnWhite: testContrast(BRAND_COLORS.schoolBlue.dark, BRAND_COLORS.neutral.white),
    darkGoldOnWhite: testContrast(BRAND_COLORS.schoolGold.dark, BRAND_COLORS.neutral.white)
  };

  // Test text combinations
  results.textCombinations = {
    darkTextOnLight: testContrast(BRAND_COLORS.neutral.gray900, BRAND_COLORS.neutral.white),
    lightTextOnDark: testContrast(BRAND_COLORS.neutral.white, BRAND_COLORS.neutral.gray900),
    mediumTextOnLight: testContrast(BRAND_COLORS.neutral.gray600, BRAND_COLORS.neutral.white),
    subtleTextOnLight: testContrast(BRAND_COLORS.neutral.gray500, BRAND_COLORS.neutral.white)
  };

  // Test interactive elements
  results.interactiveElements = {
    linkColor: testContrast(BRAND_COLORS.schoolBlue.main, BRAND_COLORS.neutral.white),
    hoverLinkColor: testContrast(BRAND_COLORS.schoolBlue.dark, BRAND_COLORS.neutral.white),
    buttonPrimary: testContrast(BRAND_COLORS.neutral.white, BRAND_COLORS.schoolBlue.main),
    buttonSecondary: testContrast(BRAND_COLORS.schoolBlue.main, BRAND_COLORS.neutral.white),
    focusIndicator: testContrast(BRAND_COLORS.schoolBlue.main, BRAND_COLORS.neutral.white)
  };

  // Test semantic colors
  results.semanticColors = {
    successText: testContrast(BRAND_COLORS.semantic.success, BRAND_COLORS.neutral.white),
    warningText: testContrast(BRAND_COLORS.semantic.warning, BRAND_COLORS.neutral.white),
    errorText: testContrast(BRAND_COLORS.semantic.error, BRAND_COLORS.neutral.white),
    infoText: testContrast(BRAND_COLORS.semantic.info, BRAND_COLORS.neutral.white)
  };

  return results;
}

// Generate improved color combinations that meet WCAG AA standards
export function getAccessibleColorAlternatives() {
  return {
    schoolBlue: {
      // For text on white backgrounds
      textOnWhite: BRAND_COLORS.schoolBlue.dark, // #1d4ed8 - better contrast than main
      // For white text on blue backgrounds
      backgroundForWhiteText: BRAND_COLORS.schoolBlue.main, // Already good
      // For light backgrounds
      lightBackground: BRAND_COLORS.schoolBlue[50],
      // For dark mode
      darkModeText: BRAND_COLORS.schoolBlue.light
    },
    schoolGold: {
      // Gold often has contrast issues, use darker version for text
      textOnWhite: BRAND_COLORS.schoolGold.dark, // #d97706
      backgroundForWhiteText: BRAND_COLORS.schoolGold.dark,
      lightBackground: BRAND_COLORS.schoolGold[50],
      darkModeText: BRAND_COLORS.schoolGold.light
    },
    text: {
      // High contrast text combinations
      primary: BRAND_COLORS.neutral.gray900,
      secondary: BRAND_COLORS.neutral.gray600,
      muted: BRAND_COLORS.neutral.gray500,
      inverse: BRAND_COLORS.neutral.white,
      // Link colors with good contrast
      link: BRAND_COLORS.schoolBlue.dark,
      linkHover: BRAND_COLORS.schoolBlue[600],
      linkVisited: '#6b46c1' // Purple for visited links
    },
    backgrounds: {
      // Safe background colors
      primary: BRAND_COLORS.neutral.white,
      secondary: BRAND_COLORS.neutral.gray50,
      tertiary: BRAND_COLORS.neutral.gray100,
      inverse: BRAND_COLORS.neutral.gray900,
      brandLight: BRAND_COLORS.schoolBlue[50],
      brandMedium: BRAND_COLORS.schoolBlue[100]
    }
  };
}

// Real-time contrast checker for development
export function checkContrastInDom() {
  if (typeof window === 'undefined') return;

  const issues: Array<{
    element: Element;
    computedForeground: string;
    computedBackground: string;
    contrast: ContrastResult;
    selector: string;
  }> = [];

  // Find all text elements
  const textElements = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, a, button, label, div, td, th');
  
  textElements.forEach((element) => {
    const styles = window.getComputedStyle(element);
    const foreground = styles.color;
    const background = styles.backgroundColor;
    
    // Skip if background is transparent
    if (background === 'rgba(0, 0, 0, 0)' || background === 'transparent') return;
    
    const contrast = testContrast(foreground, background);
    
    // Report AA failures
    if (!contrast.passes.AA_normal) {
      issues.push({
        element,
        computedForeground: foreground,
        computedBackground: background,
        contrast,
        selector: getElementSelector(element)
      });
    }
  });

  return issues;
}

function getElementSelector(element: Element): string {
  if (element.id) return `#${element.id}`;
  if (element.className) return `.${element.className.split(' ')[0]}`;
  return element.tagName.toLowerCase();
}

// Generate CSS custom properties for accessible colors
export function generateAccessibleCSSVars() {
  const alternatives = getAccessibleColorAlternatives();
  
  return `
/* Accessible color variables for WCAG AA compliance */
:root {
  /* School Blue - WCAG AA compliant variations */
  --school-blue-text: ${alternatives.schoolBlue.textOnWhite};
  --school-blue-bg: ${alternatives.schoolBlue.backgroundForWhiteText};
  --school-blue-light-bg: ${alternatives.schoolBlue.lightBackground};
  
  /* School Gold - WCAG AA compliant variations */
  --school-gold-text: ${alternatives.schoolGold.textOnWhite};
  --school-gold-bg: ${alternatives.schoolGold.backgroundForWhiteText};
  --school-gold-light-bg: ${alternatives.schoolGold.lightBackground};
  
  /* High contrast text */
  --text-primary: ${alternatives.text.primary};
  --text-secondary: ${alternatives.text.secondary};
  --text-muted: ${alternatives.text.muted};
  --text-inverse: ${alternatives.text.inverse};
  
  /* Accessible link colors */
  --link-color: ${alternatives.text.link};
  --link-hover: ${alternatives.text.linkHover};
  --link-visited: ${alternatives.text.linkVisited};
  
  /* Safe background colors */
  --bg-primary: ${alternatives.backgrounds.primary};
  --bg-secondary: ${alternatives.backgrounds.secondary};
  --bg-tertiary: ${alternatives.backgrounds.tertiary};
  --bg-inverse: ${alternatives.backgrounds.inverse};
  --bg-brand-light: ${alternatives.backgrounds.brandLight};
  --bg-brand-medium: ${alternatives.backgrounds.brandMedium};
}

.dark {
  /* Dark mode accessible colors */
  --school-blue-text: ${alternatives.schoolBlue.darkModeText};
  --school-gold-text: ${alternatives.schoolGold.darkModeText};
  --text-primary: ${alternatives.text.inverse};
  --text-secondary: ${BRAND_COLORS.neutral.gray300};
  --text-muted: ${BRAND_COLORS.neutral.gray400};
  --text-inverse: ${alternatives.text.primary};
}
`;
}

// Hook for runtime contrast monitoring (development only)
export function useContrastMonitoring() {
  if (process.env.NODE_ENV !== 'development') return;

  const checkContrast = () => {
    const issues = checkContrastInDom();
    if (issues && issues.length > 0) {
      console.warn('🎨 Color contrast issues found:', issues);
      console.table(issues.map(issue => ({
        selector: issue.selector,
        foreground: issue.computedForeground,
        background: issue.computedBackground,
        ratio: issue.contrast.ratio,
        passesAA: issue.contrast.passes.AA_normal
      })));
    }
  };

  // Check after DOM updates
  setTimeout(checkContrast, 1000);
}