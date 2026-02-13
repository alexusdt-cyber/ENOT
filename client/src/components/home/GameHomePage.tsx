import { useState, useEffect, useRef } from "react";
import { Paintbrush, Check, X } from "lucide-react";
import { HeroCard } from "./HeroCard";
import { ReferralProgramCard } from "./ReferralProgramCard";
import { ModularWidgetGrid } from "./ModularWidgetGrid";

// Background types: "repeat" for tiling patterns, "cover" for full images
export interface HomeBackground {
  id: string;
  name: string;
  type: "repeat" | "cover";
  lightUrl: string;
  darkUrl: string;
  isDefault?: boolean;
}

// Default backgrounds - puzzle pattern from auth page
const defaultBackgrounds: HomeBackground[] = [
  {
    id: "puzzle-pattern",
    name: "Пазл",
    type: "repeat",
    lightUrl: "/password-bg-pattern.svg",
    darkUrl: "/password-bg-pattern-dark.svg",
    isDefault: true,
  },
];

const STORAGE_KEY = "noteflow-home-background";

interface GameHomePageProps {
  isDark?: boolean;
  userName?: string;
}

export function GameHomePage({ isDark = true, userName = "User" }: GameHomePageProps) {
  const [backgrounds] = useState<HomeBackground[]>(defaultBackgrounds);
  const [selectedBackgroundId, setSelectedBackgroundId] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved || "puzzle-pattern";
  });
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const selectedBackground = backgrounds.find(bg => bg.id === selectedBackgroundId) || backgrounds[0];

  // Save selection to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selectedBackgroundId);
  }, [selectedBackgroundId]);

  // Close picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowBackgroundPicker(false);
      }
    };
    if (showBackgroundPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showBackgroundPicker]);

  // Generate background style based on type
  const getBackgroundStyle = (): React.CSSProperties => {
    const url = isDark ? selectedBackground.darkUrl : selectedBackground.lightUrl;
    
    if (selectedBackground.type === "repeat") {
      return {
        backgroundImage: `url('${url}')`,
        backgroundRepeat: "repeat",
        backgroundPosition: "center center",
      };
    } else {
      // Type "cover" - center the image, scale up if needed but don't crop
      return {
        backgroundImage: `url('${url}')`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center center",
        backgroundSize: "cover",
      };
    }
  };

  return (
    <div 
      className={`min-h-screen relative overflow-hidden ${isDark ? "bg-[#0a0a1a]" : "bg-gray-50"}`}
      style={getBackgroundStyle()}
    >
      <div className="relative z-10 p-4 md:p-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              Привет, {userName}! 👋
            </h1>
            <p className={`text-sm ${isDark ? "text-white/60" : "text-gray-600"}`}>Добро пожаловать в eNote</p>
          </div>
          
          {/* Background picker button - right side */}
          <div className="relative" ref={pickerRef}>
            <button
              onClick={() => setShowBackgroundPicker(!showBackgroundPicker)}
              className={`p-2 rounded-lg transition-all ${
                isDark 
                  ? "hover:bg-white/10 text-white/60 hover:text-white" 
                  : "hover:bg-gray-200/60 text-gray-500 hover:text-gray-700"
              } ${showBackgroundPicker ? (isDark ? "bg-white/10" : "bg-gray-200/60") : ""}`}
              title="Сменить фон"
              data-testid="button-change-background"
            >
              <Paintbrush className="w-5 h-5" />
            </button>
            
            {/* Background picker dropdown */}
            {showBackgroundPicker && (
              <div 
                className={`absolute right-0 top-full mt-2 w-64 rounded-xl shadow-2xl border backdrop-blur-xl z-50 ${
                  isDark 
                    ? "bg-slate-900/95 border-slate-700" 
                    : "bg-white/95 border-gray-200"
                }`}
              >
                <div className={`px-4 py-3 border-b flex items-center justify-between ${
                  isDark ? "border-slate-700" : "border-gray-200"
                }`}>
                  <span className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                    Выбор фона
                  </span>
                  <button 
                    onClick={() => setShowBackgroundPicker(false)}
                    className={`p-1 rounded hover:bg-white/10 ${isDark ? "text-slate-400" : "text-gray-500"}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
                  {backgrounds.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => {
                        setSelectedBackgroundId(bg.id);
                        setShowBackgroundPicker(false);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                        selectedBackgroundId === bg.id
                          ? isDark 
                            ? "bg-indigo-600/30 border border-indigo-500/50" 
                            : "bg-indigo-100 border border-indigo-300"
                          : isDark 
                            ? "hover:bg-white/5 border border-transparent" 
                            : "hover:bg-gray-100 border border-transparent"
                      }`}
                      data-testid={`background-option-${bg.id}`}
                    >
                      {/* Preview thumbnail */}
                      <div 
                        className="w-12 h-12 rounded-lg border overflow-hidden flex-shrink-0"
                        style={{
                          backgroundImage: `url('${isDark ? bg.darkUrl : bg.lightUrl}')`,
                          backgroundRepeat: bg.type === "repeat" ? "repeat" : "no-repeat",
                          backgroundSize: bg.type === "repeat" ? "auto" : "cover",
                          backgroundPosition: "center",
                          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                        }}
                      />
                      
                      <div className="flex-1 text-left">
                        <p className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                          {bg.name}
                        </p>
                        <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                          {bg.type === "repeat" ? "Паттерн" : "Изображение"}
                        </p>
                      </div>
                      
                      {selectedBackgroundId === bg.id && (
                        <Check className={`w-5 h-5 flex-shrink-0 ${
                          isDark ? "text-indigo-400" : "text-indigo-600"
                        }`} />
                      )}
                    </button>
                  ))}
                  
                  {backgrounds.length === 1 && (
                    <p className={`text-xs text-center py-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                      Больше фонов скоро появится
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>
        
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Referral Program - spans 2 columns */}
            <div className="lg:col-span-2 lg:row-span-2">
              <ReferralProgramCard
                isDark={isDark}
                referralCode="REF123ABC"
                invitedCount={8}
                totalEarnings={184.50}
                currentRank="Грандмастер"
                rankProgress={3780}
                rankMax={4500}
              />
            </div>
            
            {/* Right side cards */}
            <HeroCard
              title="АКТИВНЫЕ ТУРНИРЫ"
              subtitle="12 турниров"
              imageUrl="/attached_assets/PIRAT_COIN_1767966617725.png"
              variant="gold"
              size="small"
              showClaimButton={false}
              isDark={isDark}
            />
            <HeroCard
              title="ИГРОВАЯ СТАТИСТИКА"
              subtitle="Ваш прогресс"
              imageUrl="/attached_assets/PIRAT_COIN_1767966617725.png"
              variant="cyan"
              size="small"
              showClaimButton={false}
              isDark={isDark}
            />
            <HeroCard
              title="ПОПУЛЯРНЫЕ СТОЛЫ"
              subtitle="Горячие игры"
              variant="pink"
              size="small"
              showClaimButton={true}
              claimLabel="ИГРАТЬ"
              isDark={isDark}
            />
            <HeroCard
              title="БЫСТРАЯ ПОМОЩЬ"
              subtitle="24/7 поддержка"
              variant="green"
              size="small"
              showClaimButton={false}
              isDark={isDark}
            />
          </div>
        </section>
        
        <section>
          <ModularWidgetGrid isDark={isDark} />
        </section>
      </div>
    </div>
  );
}
