import { motion } from "framer-motion";
import { Play, Search, RefreshCw, Users, Trophy, Coins } from "lucide-react";
import { useState } from "react";

interface LiveTableEntry {
  id: string;
  teamName: string;
  teamIcon?: string;
  teamColor: string;
  players: { id: string; avatarUrl: string; name: string }[];
  balance: number;
  currency?: string;
  status: "active" | "waiting" | "full";
}

interface LiveTablesPanelProps {
  tables?: LiveTableEntry[];
  onJoin?: (tableId: string) => void;
  onSearch?: (query: string) => void;
  isDark?: boolean;
}

const mockTables: LiveTableEntry[] = [
  {
    id: "1",
    teamName: "NLH",
    teamIcon: "🎯",
    teamColor: "#f59e0b",
    players: [
      { id: "1", avatarUrl: "", name: "Player 1" },
      { id: "2", avatarUrl: "", name: "Player 2" },
      { id: "3", avatarUrl: "", name: "Player 3" },
    ],
    balance: 1270,
    currency: "$",
    status: "active",
  },
  {
    id: "2",
    teamName: "FLH",
    teamIcon: "⚡",
    teamColor: "#ec4899",
    players: [
      { id: "1", avatarUrl: "", name: "Player 1" },
      { id: "2", avatarUrl: "", name: "Player 2" },
    ],
    balance: 4270,
    currency: "$",
    status: "waiting",
  },
  {
    id: "3",
    teamName: "PLO",
    teamIcon: "🔥",
    teamColor: "#8b5cf6",
    players: [
      { id: "1", avatarUrl: "", name: "Player 1" },
      { id: "2", avatarUrl: "", name: "Player 2" },
      { id: "3", avatarUrl: "", name: "Player 3" },
      { id: "4", avatarUrl: "", name: "Player 4" },
    ],
    balance: 1610,
    currency: "$",
    status: "active",
  },
  {
    id: "4",
    teamName: "PLO",
    teamIcon: "💎",
    teamColor: "#06b6d4",
    players: [
      { id: "1", avatarUrl: "", name: "Player 1" },
      { id: "2", avatarUrl: "", name: "Player 2" },
    ],
    balance: 3750,
    currency: "$",
    status: "waiting",
  },
];

export function LiveTablesPanel({
  tables = mockTables,
  onJoin,
  onSearch,
  isDark = true,
}: LiveTablesPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTables = tables.filter((table) =>
    table.teamName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        rounded-3xl overflow-hidden
        ${isDark 
          ? 'bg-slate-900/80 border border-white/10' 
          : 'bg-white/80 border border-gray-200/50'
        }
        backdrop-blur-xl shadow-2xl
      `}
      data-testid="live-tables-panel"
    >
      <div className={`px-6 py-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200/50'}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className={`
                w-10 h-10 rounded-full flex items-center justify-center
                ${isDark ? 'bg-purple-500/20' : 'bg-purple-100'}
              `}
            >
              <Play className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
            </motion.div>
            <div>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                LIVE TABLES
              </h2>
              <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                Обновляется каждые 30 секунд
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`
              relative flex items-center rounded-full overflow-hidden
              ${isDark ? 'bg-white/10' : 'bg-gray-100'}
            `}>
              <Search className={`absolute left-3 w-4 h-4 ${isDark ? 'text-white/50' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  onSearch?.(e.target.value);
                }}
                className={`
                  w-40 pl-10 pr-4 py-2 bg-transparent outline-none text-sm
                  ${isDark ? 'text-white placeholder:text-white/50' : 'text-gray-900 placeholder:text-gray-400'}
                `}
                data-testid="input-live-tables-search"
              />
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                px-4 py-2 rounded-full text-sm font-medium
                ${isDark 
                  ? 'bg-white/10 text-white hover:bg-white/20' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
                transition-colors
              `}
              data-testid="button-see-more"
            >
              See more
            </motion.button>
          </div>
        </div>
      </div>
      
      <div className="divide-y divide-white/5">
        {filteredTables.map((table, index) => (
          <motion.div
            key={table.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`
              px-6 py-4 flex items-center justify-between gap-4 flex-wrap
              ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}
              transition-colors cursor-pointer
            `}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
                style={{ 
                  backgroundColor: `${table.teamColor}20`,
                  border: `2px solid ${table.teamColor}`,
                }}
              >
                {table.teamIcon || table.teamName[0]}
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {table.teamName}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    table.status === "active" 
                      ? "bg-green-500/20 text-green-400" 
                      : table.status === "waiting"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-red-500/20 text-red-400"
                  }`}>
                    {table.status === "active" ? "Активно" : table.status === "waiting" ? "Ожидание" : "Заполнено"}
                  </span>
                </div>
                <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                  {table.players.length} игроков
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {table.players.slice(0, 5).map((player, i) => (
                  <div
                    key={player.id}
                    className={`
                      w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold
                      ${isDark 
                        ? 'bg-slate-700 border-slate-800 text-white' 
                        : 'bg-gray-200 border-white text-gray-700'
                      }
                    `}
                    title={player.name}
                  >
                    {player.avatarUrl ? (
                      <img src={player.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      player.name[0]
                    )}
                  </div>
                ))}
                {table.players.length > 5 && (
                  <div className={`
                    w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs
                    ${isDark 
                      ? 'bg-purple-500/30 border-slate-800 text-purple-300' 
                      : 'bg-purple-100 border-white text-purple-600'
                    }
                  `}>
                    +{table.players.length - 5}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                Table balance:
              </span>
              <div className="flex items-center gap-1">
                <Coins className={`w-4 h-4 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {table.currency}{table.balance.toLocaleString()}
                </span>
              </div>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onJoin?.(table.id)}
              className={`
                px-6 py-2.5 rounded-full font-bold text-sm
                bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500
                text-white shadow-lg shadow-purple-500/30
                hover:shadow-purple-500/50 transition-shadow
                flex items-center gap-2
              `}
              data-testid={`button-join-${table.id}`}
            >
              JOIN
              <Play className="w-4 h-4" />
            </motion.button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
