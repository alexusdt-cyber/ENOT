import { useId } from "react";
import { usePageVisibility } from "../../hooks/usePageVisibility";

interface AnimatedAuroraBackgroundProps {
  variant?: "purple" | "gold" | "cyan" | "pink" | "green";
  intensity?: "low" | "medium" | "high";
  isDark?: boolean;
}

const colorSchemes = {
  purple: {
    dark: ["#6366f1", "#8b5cf6", "#a855f7", "#7c3aed"],
    light: ["#818cf8", "#a78bfa", "#c084fc", "#8b5cf6"],
  },
  gold: {
    dark: ["#f59e0b", "#d97706", "#fbbf24", "#b45309"],
    light: ["#fbbf24", "#f59e0b", "#fcd34d", "#d97706"],
  },
  cyan: {
    dark: ["#06b6d4", "#0891b2", "#22d3ee", "#0e7490"],
    light: ["#22d3ee", "#06b6d4", "#67e8f9", "#0891b2"],
  },
  pink: {
    dark: ["#ec4899", "#db2777", "#f472b6", "#be185d"],
    light: ["#f472b6", "#ec4899", "#f9a8d4", "#db2777"],
  },
  green: {
    dark: ["#10b981", "#059669", "#34d399", "#047857"],
    light: ["#34d399", "#10b981", "#6ee7b7", "#059669"],
  },
};

export function AnimatedAuroraBackground({
  variant = "purple",
  intensity = "medium",
  isDark = true,
}: AnimatedAuroraBackgroundProps) {
  const gradientId = useId();
  const isVisible = usePageVisibility();
  const colors = isDark ? colorSchemes[variant].dark : colorSchemes[variant].light;
  
  const opacityMap = {
    low: { base: 0.3, peak: 0.5 },
    medium: { base: 0.5, peak: 0.8 },
    high: { base: 0.7, peak: 1 },
  };
  
  const opacity = opacityMap[intensity];

  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <filter id={`${gradientId}-blur`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="30" />
          </filter>
          <linearGradient id={`${gradientId}-grad1`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors[0]}>
              {isVisible && (
                <animate attributeName="stop-color" values={`${colors[0]};${colors[1]};${colors[2]};${colors[0]}`} dur="8s" repeatCount="indefinite" />
              )}
            </stop>
            <stop offset="50%" stopColor={colors[1]}>
              {isVisible && (
                <animate attributeName="stop-color" values={`${colors[1]};${colors[2]};${colors[3]};${colors[1]}`} dur="6s" repeatCount="indefinite" />
              )}
            </stop>
            <stop offset="100%" stopColor={colors[2]}>
              {isVisible && (
                <animate attributeName="stop-color" values={`${colors[2]};${colors[3]};${colors[0]};${colors[2]}`} dur="10s" repeatCount="indefinite" />
              )}
            </stop>
          </linearGradient>
          <linearGradient id={`${gradientId}-grad2`} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors[2]}>
              {isVisible && (
                <animate attributeName="stop-color" values={`${colors[2]};${colors[0]};${colors[3]};${colors[2]}`} dur="9s" repeatCount="indefinite" />
              )}
            </stop>
            <stop offset="100%" stopColor={colors[3]}>
              {isVisible && (
                <animate attributeName="stop-color" values={`${colors[3]};${colors[1]};${colors[0]};${colors[3]}`} dur="7s" repeatCount="indefinite" />
              )}
            </stop>
          </linearGradient>
          <radialGradient id={`${gradientId}-glow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors[0]} stopOpacity="0.8" />
            <stop offset="100%" stopColor={colors[2]} stopOpacity="0" />
          </radialGradient>
        </defs>
        
        <ellipse
          cx="40%"
          cy="40%"
          rx="70%"
          ry="50%"
          fill={`url(#${gradientId}-grad1)`}
          filter={`url(#${gradientId}-blur)`}
          opacity={opacity.base}
          className={isVisible ? "aurora-blob-1" : ""}
        />
        
        <ellipse
          cx="60%"
          cy="60%"
          rx="60%"
          ry="45%"
          fill={`url(#${gradientId}-grad2)`}
          filter={`url(#${gradientId}-blur)`}
          opacity={opacity.base * 0.8}
          className={isVisible ? "aurora-blob-2" : ""}
        />
        
        <circle
          cx="50%"
          cy="50%"
          r="30%"
          fill={`url(#${gradientId}-glow)`}
          opacity={0.4}
          className={isVisible ? "aurora-glow" : ""}
        />
      </svg>
      
      <div className={`absolute inset-0 ${isDark ? 'bg-black/30' : 'bg-white/20'} backdrop-blur-[1px]`} />
      
      <style>{`
        @keyframes aurora-move-1 {
          0%, 100% { transform: translate(0, 0); opacity: ${opacity.base}; }
          33% { transform: translate(20%, 10%); opacity: ${opacity.peak}; }
          66% { transform: translate(10%, 20%); opacity: ${opacity.base * 0.8}; }
        }
        @keyframes aurora-move-2 {
          0%, 100% { transform: translate(0, 0); opacity: ${opacity.base * 0.8}; }
          33% { transform: translate(-20%, -15%); opacity: ${opacity.peak * 0.9}; }
          66% { transform: translate(-5%, -25%); opacity: ${opacity.base}; }
        }
        @keyframes aurora-glow-pulse {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
          50% { transform: translate(-5%, 5%) scale(1.1); opacity: 0.6; }
        }
        .aurora-blob-1 { animation: aurora-move-1 15s ease-in-out infinite; }
        .aurora-blob-2 { animation: aurora-move-2 18s ease-in-out infinite; }
        .aurora-glow { animation: aurora-glow-pulse 12s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
