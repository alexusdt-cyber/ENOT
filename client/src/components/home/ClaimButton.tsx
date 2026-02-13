import { Sparkles, Zap } from "lucide-react";

interface ClaimButtonProps {
  onClick?: () => void;
  variant?: "primary" | "gold" | "pink";
  size?: "sm" | "md" | "lg";
  label?: string;
  disabled?: boolean;
  isDark?: boolean;
}

const variants = {
  primary: {
    gradient: "from-violet-600 via-purple-600 to-indigo-600",
    glow: "shadow-purple-500/50",
    hoverGlow: "hover:shadow-purple-500/70",
    ring: "ring-purple-400/50",
  },
  gold: {
    gradient: "from-amber-500 via-yellow-500 to-orange-500",
    glow: "shadow-amber-500/50",
    hoverGlow: "hover:shadow-amber-500/70",
    ring: "ring-amber-400/50",
  },
  pink: {
    gradient: "from-pink-500 via-rose-500 to-red-500",
    glow: "shadow-pink-500/50",
    hoverGlow: "hover:shadow-pink-500/70",
    ring: "ring-pink-400/50",
  },
};

const sizes = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
};

export function ClaimButton({
  onClick,
  variant = "primary",
  size = "md",
  label = "CLAIM",
  disabled = false,
}: ClaimButtonProps) {
  const style = variants[variant];
  const sizeClass = sizes[size];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        claim-button relative overflow-hidden rounded-2xl font-bold text-white
        bg-gradient-to-r ${style.gradient}
        shadow-xl ${style.glow} ${style.hoverGlow}
        transition-all duration-300
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeClass}
        ring-2 ${style.ring}
        hover:scale-105 hover:-translate-y-0.5
        active:scale-95
      `}
      data-testid="button-claim"
    >
      <div className="claim-shimmer absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0" />
      
      <div className="relative flex items-center justify-center gap-2">
        <Sparkles className="w-5 h-5 claim-sparkle" />
        <span className="tracking-wider">{label}</span>
        <Zap className="w-5 h-5 claim-zap" />
      </div>
      
      <div className="claim-dot absolute top-1 right-1">
        <div className="w-2 h-2 bg-white rounded-full" />
      </div>
      
      <style>{`
        .claim-shimmer {
          animation: shimmer 3s ease-in-out infinite;
        }
        .claim-sparkle {
          animation: sparkle 2s ease-in-out infinite;
        }
        .claim-zap {
          animation: zap 1s ease-in-out infinite;
        }
        .claim-dot {
          animation: dot-pulse 2s ease-in-out infinite;
        }
        @keyframes shimmer {
          0% { transform: translateX(-200%); }
          100% { transform: translateX(200%); }
        }
        @keyframes sparkle {
          0%, 100% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(15deg) scale(1.2); }
          75% { transform: rotate(-15deg) scale(1); }
        }
        @keyframes zap {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(3px); }
        }
        @keyframes dot-pulse {
          0%, 100% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </button>
  );
}
