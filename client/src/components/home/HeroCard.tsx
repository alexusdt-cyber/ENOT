import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { AnimatedAuroraBackground } from "./AnimatedAuroraBackground";
import { ClaimButton } from "./ClaimButton";

interface HeroCardProps {
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  variant?: "purple" | "gold" | "cyan" | "pink" | "green";
  size?: "small" | "medium" | "large";
  showClaimButton?: boolean;
  claimLabel?: string;
  onClaim?: () => void;
  onClick?: () => void;
  isDark?: boolean;
}

export function HeroCard({
  title,
  subtitle,
  description,
  imageUrl,
  variant = "purple",
  size = "medium",
  showClaimButton = true,
  claimLabel = "CLAIM",
  onClaim,
  onClick,
  isDark = true,
}: HeroCardProps) {
  const sizeClasses = {
    small: "col-span-1 row-span-1",
    medium: "col-span-1 row-span-2 md:col-span-1",
    large: "col-span-2 row-span-2",
  };

  const heightClasses = {
    small: "min-h-[180px]",
    medium: "min-h-[280px]",
    large: "min-h-[320px]",
  };

  const buttonVariant = variant === "gold" ? "gold" : variant === "pink" ? "pink" : "primary";

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative overflow-hidden rounded-3xl cursor-pointer
        ${sizeClasses[size]} ${heightClasses[size]}
        ${isDark 
          ? 'bg-slate-900/80 border border-white/10' 
          : 'bg-white/80 border border-gray-200/50'
        }
        backdrop-blur-xl shadow-2xl
        group
      `}
      data-testid={`hero-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <AnimatedAuroraBackground variant={variant} intensity="medium" isDark={isDark} />
      
      <div className="relative z-10 h-full flex flex-col p-5">
        <motion.button
          whileHover={{ scale: 1.1, x: 3 }}
          className={`
            absolute top-4 right-4 w-10 h-10 rounded-full
            flex items-center justify-center
            ${isDark 
              ? 'bg-white/20 hover:bg-white/30' 
              : 'bg-black/10 hover:bg-black/20'
            }
            backdrop-blur-sm transition-colors
          `}
        >
          <ArrowRight className={`w-5 h-5 ${isDark ? 'text-white' : 'text-gray-800'}`} />
        </motion.button>
        
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`
                text-xl md:text-2xl font-bold leading-tight mb-1
                ${isDark ? 'text-white' : 'text-gray-900'}
              `}
            >
              {title}
            </motion.h3>
            {subtitle && (
              <p className={`text-sm ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                {subtitle}
              </p>
            )}
            {description && (
              <p className={`text-xs mt-2 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                {description}
              </p>
            )}
          </div>
          
          {imageUrl && (
            <motion.div
              className="absolute bottom-4 right-4 w-24 h-24 md:w-32 md:h-32"
              animate={{
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full object-contain drop-shadow-2xl"
              />
            </motion.div>
          )}
          
          {showClaimButton && (
            <div className="mt-4">
              <ClaimButton
                onClick={(e) => {
                  e?.stopPropagation?.();
                  onClaim?.();
                }}
                variant={buttonVariant}
                size="md"
                label={claimLabel}
                isDark={isDark}
              />
            </div>
          )}
        </div>
      </div>
      
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: isDark 
            ? 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)' 
            : 'linear-gradient(135deg, rgba(0,0,0,0.05) 0%, transparent 50%)',
        }}
      />
    </motion.div>
  );
}
