import * as stylex from '@stylexjs/stylex';

export const colors = stylex.defineVars({
  bgRoot: '#07090e',
  bgPanel: '#0c1017',
  bgCard: '#111722',
  bgHover: '#161f2e',
  bgActive: '#1c273a',
  
  borderSubtle: '#182232',
  borderDefault: '#223047',
  borderGlow: '#334869',
  hairlineSubtle: 'rgba(255, 255, 255, 0.08)',
  hairlineBright: 'rgba(255, 255, 255, 0.2)',

  neonGreen: '#00ff88',
  neonGreenBg: 'rgba(0, 255, 136, 0.08)',
  neonGreenBorder: 'rgba(0, 255, 136, 0.25)',

  neonLime: '#c7ff5e',
  neonLimeBg: 'rgba(199, 255, 94, 0.08)',
  neonLimeBorder: 'rgba(199, 255, 94, 0.3)',

  neonRed: '#ff3366',
  neonRedBg: 'rgba(255, 51, 102, 0.08)',
  neonRedBorder: 'rgba(255, 51, 102, 0.25)',

  neonRose: '#f43f5e',
  neonRoseBg: 'rgba(244, 63, 94, 0.08)',
  neonRoseBorder: 'rgba(244, 63, 94, 0.3)',

  neonAmber: '#ffb020',
  neonAmberBg: 'rgba(255, 176, 32, 0.08)',
  neonAmberBorder: 'rgba(255, 176, 32, 0.25)',

  neonCyan: '#00e5ff',
  neonCyanBg: 'rgba(0, 229, 255, 0.08)',
  neonCyanBorder: 'rgba(0, 229, 255, 0.25)',

  neonPurple: '#b388ff',
  neonPurpleBg: 'rgba(179, 136, 255, 0.08)',
  neonPurpleBorder: 'rgba(179, 136, 255, 0.25)',

  textPrimary: '#f3f4f6',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',
  textDim: '#4b5563',
});

export const typography = stylex.defineVars({
  fontMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontSans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
});

export const motion = stylex.defineVars({
  easeSpring: 'cubic-bezier(0.16, 1, 0.3, 1)',
  durationFast: '140ms',
  durationNormal: '240ms',
  durationSlow: '350ms',
});
