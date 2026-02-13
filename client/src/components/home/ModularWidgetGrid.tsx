import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { 
  Grid3X3, 
  Save, 
  RotateCcw, 
  Plus, 
  Settings,
  Check,
  X,
  Loader2
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { widgetComponents } from "../widgets";

interface GridSlot {
  slotId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface SlotMapping {
  slotId: string;
  widgetId: string | null;
  widgetConfig?: Record<string, any>;
}

interface GridPreset {
  id: string;
  name: string;
  description?: string;
  columns: number;
  slots: GridSlot[];
  isDefault?: boolean;
}

interface WidgetCatalogItem {
  id: string;
  key: string;
  title: string;
  description?: string;
  icon?: string;
  componentKey: string;
}

interface UserLayoutResponse {
  presetId: string;
  preset?: GridPreset;
  slotsMapping: SlotMapping[];
}

interface ModularWidgetGridProps {
  isDark?: boolean;
}

const DND_ITEM_TYPE = "WIDGET_SLOT";

function DraggableSlot({
  slot,
  mapping,
  widgets,
  isDark,
  isEditing,
  columns,
  onSelectWidget,
  onRemoveWidget,
  onSwapSlots,
}: {
  slot: GridSlot;
  mapping: SlotMapping | undefined;
  widgets: WidgetCatalogItem[];
  isDark: boolean;
  isEditing: boolean;
  columns: number;
  onSelectWidget: (slotId: string) => void;
  onRemoveWidget: (slotId: string) => void;
  onSwapSlots: (fromSlotId: string, toSlotId: string) => void;
}) {
  const [{ isDragging }, drag] = useDrag({
    type: DND_ITEM_TYPE,
    item: { slotId: slot.slotId },
    canDrag: isEditing && mapping?.widgetId !== null,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: DND_ITEM_TYPE,
    drop: (item: { slotId: string }) => {
      if (item.slotId !== slot.slotId) {
        onSwapSlots(item.slotId, slot.slotId);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const widgetInfo = mapping?.widgetId 
    ? widgets.find(w => w.key === mapping.widgetId)
    : null;

  const WidgetComponent = widgetInfo 
    ? widgetComponents[widgetInfo.componentKey]
    : null;

  const gridStyle = {
    gridColumn: `span ${Math.min(slot.w, columns)} / span ${Math.min(slot.w, columns)}`,
    gridRow: slot.h > 1 ? `span ${slot.h} / span ${slot.h}` : undefined,
  };

  const combinedRef = (node: HTMLDivElement | null) => {
    drag(drop(node));
  };

  return (
    <motion.div
      ref={combinedRef}
      style={gridStyle}
      className={`
        relative min-h-[120px]
        ${isDragging ? "opacity-50 scale-95" : ""}
        ${isOver && isEditing ? "ring-2 ring-purple-500" : ""}
      `}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      data-testid={`slot-${slot.slotId}`}
    >
      {WidgetComponent ? (
        <WidgetComponent 
          isDark={isDark}
          isEditing={isEditing}
          onRemove={() => onRemoveWidget(slot.slotId)}
          slotSize={{ w: slot.w, h: slot.h }}
        />
      ) : (
        <div className={`
          h-full min-h-[120px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all
          ${isDark 
            ? "border-white/20 bg-white/5 hover:border-purple-500/50 hover:bg-white/10" 
            : "border-gray-200 bg-gray-50 hover:border-purple-400 hover:bg-gray-100"
          }
        `}
        onClick={() => isEditing && onSelectWidget(slot.slotId)}
        >
          <Plus className={`w-8 h-8 ${isDark ? "text-white/30" : "text-gray-300"}`} />
          <span className={`text-sm ${isDark ? "text-white/40" : "text-gray-400"}`}>
            {isEditing ? "Добавить виджет" : "Пустой слот"}
          </span>
        </div>
      )}
    </motion.div>
  );
}

function PresetSelector({
  presets,
  currentPresetId,
  onSelect,
  isDark,
  isOpen,
  onClose,
}: {
  presets: GridPreset[];
  currentPresetId: string;
  onSelect: (presetId: string) => void;
  isDark: boolean;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`
        absolute top-full left-0 mt-2 p-4 rounded-2xl z-50 min-w-[300px] shadow-2xl
        ${isDark ? "bg-gray-900 border border-white/10" : "bg-white border border-gray-200"}
      `}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
          Выбор сетки
        </h3>
        <button onClick={onClose}>
          <X className={`w-5 h-5 ${isDark ? "text-white/50" : "text-gray-400"}`} />
        </button>
      </div>
      <div className="space-y-2">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => {
              onSelect(preset.id);
              onClose();
            }}
            className={`
              w-full p-3 rounded-xl text-left transition-all flex items-center justify-between
              ${preset.id === currentPresetId
                ? (isDark ? "bg-purple-500/30 border-purple-500" : "bg-purple-100 border-purple-400")
                : (isDark ? "bg-white/5 hover:bg-white/10" : "bg-gray-50 hover:bg-gray-100")
              }
              ${isDark ? "border border-white/10" : "border border-gray-200"}
            `}
            data-testid={`preset-${preset.id}`}
          >
            <div>
              <div className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                {preset.name}
              </div>
              {preset.description && (
                <div className={`text-xs ${isDark ? "text-white/50" : "text-gray-500"}`}>
                  {preset.description}
                </div>
              )}
            </div>
            {preset.id === currentPresetId && (
              <Check className="w-5 h-5 text-purple-500" />
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function WidgetSelector({
  widgets,
  onSelect,
  isDark,
  isOpen,
  onClose,
}: {
  widgets: WidgetCatalogItem[];
  onSelect: (widgetKey: string) => void;
  isDark: boolean;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className={`
          w-full max-w-lg p-6 rounded-2xl shadow-2xl max-h-[80vh] overflow-auto
          ${isDark ? "bg-gray-900 border border-white/10" : "bg-white border border-gray-200"}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
            Выбор виджета
          </h3>
          <button onClick={onClose}>
            <X className={`w-6 h-6 ${isDark ? "text-white/50" : "text-gray-400"}`} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {widgets.map((widget) => {
            const IconComponent = widget.icon ? (LucideIcons as any)[widget.icon] : null;
            return (
              <button
                key={widget.id}
                onClick={() => {
                  onSelect(widget.key);
                  onClose();
                }}
                className={`
                  p-4 rounded-xl text-left transition-all flex flex-col gap-2
                  ${isDark 
                    ? "bg-white/5 hover:bg-white/10 border border-white/10" 
                    : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
                  }
                `}
                data-testid={`widget-option-${widget.key}`}
              >
                {IconComponent && (
                  <IconComponent className={`w-6 h-6 ${isDark ? "text-purple-400" : "text-purple-600"}`} />
                )}
                <div className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                  {widget.title}
                </div>
                {widget.description && (
                  <div className={`text-xs ${isDark ? "text-white/50" : "text-gray-500"}`}>
                    {widget.description}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function ModularWidgetGrid({ isDark = true }: ModularWidgetGridProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showPresetSelector, setShowPresetSelector] = useState(false);
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [localMapping, setLocalMapping] = useState<SlotMapping[]>([]);
  const [localPresetId, setLocalPresetId] = useState<string>("");

  const { data: presets = [], isLoading: presetsLoading } = useQuery<GridPreset[]>({
    queryKey: ["/api/grid-presets"],
    queryFn: async () => {
      const res = await fetch("/api/grid-presets");
      if (!res.ok) throw new Error("Failed to fetch presets");
      return res.json();
    },
  });

  const { data: widgetsCatalog = [], isLoading: widgetsLoading } = useQuery<WidgetCatalogItem[]>({
    queryKey: ["/api/widgets/catalog"],
    queryFn: async () => {
      const res = await fetch("/api/widgets/catalog");
      if (!res.ok) throw new Error("Failed to fetch widgets");
      return res.json();
    },
  });

  const { data: userLayout, isLoading: layoutLoading } = useQuery<UserLayoutResponse>({
    queryKey: ["/api/layout"],
    queryFn: async () => {
      const res = await fetch("/api/layout");
      if (!res.ok) throw new Error("Failed to fetch layout");
      return res.json();
    },
    enabled: presets.length > 0,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { presetId: string; slotsMapping: SlotMapping[] }) => {
      const res = await fetch("/api/layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save layout");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/layout"] });
      setIsEditing(false);
    },
  });

  useEffect(() => {
    if (userLayout) {
      setLocalPresetId(userLayout.presetId);
      setLocalMapping(userLayout.slotsMapping || []);
    } else if (presets.length > 0) {
      const defaultPreset = presets.find(p => p.isDefault) || presets[0];
      if (defaultPreset) {
        setLocalPresetId(defaultPreset.id);
        const slots = (defaultPreset.slots as GridSlot[]) || [];
        setLocalMapping(slots.map(s => ({ slotId: s.slotId, widgetId: null })));
      }
    }
  }, [userLayout, presets]);

  const currentPreset = presets.find(p => p.id === localPresetId);
  const slots = (currentPreset?.slots as GridSlot[]) || [];

  const handlePresetChange = useCallback((presetId: string) => {
    setLocalPresetId(presetId);
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      const newSlots = (preset.slots as GridSlot[]) || [];
      setLocalMapping(newSlots.map(s => ({ slotId: s.slotId, widgetId: null })));
    }
  }, [presets]);

  const handleSelectWidget = useCallback((slotId: string) => {
    setSelectedSlotId(slotId);
    setShowWidgetSelector(true);
  }, []);

  const handleWidgetSelected = useCallback((widgetKey: string) => {
    if (selectedSlotId) {
      setLocalMapping(prev => 
        prev.map(m => 
          m.slotId === selectedSlotId ? { ...m, widgetId: widgetKey } : m
        )
      );
    }
    setSelectedSlotId(null);
  }, [selectedSlotId]);

  const handleRemoveWidget = useCallback((slotId: string) => {
    setLocalMapping(prev => 
      prev.map(m => 
        m.slotId === slotId ? { ...m, widgetId: null } : m
      )
    );
  }, []);

  const handleSwapSlots = useCallback((fromSlotId: string, toSlotId: string) => {
    setLocalMapping(prev => {
      const fromMapping = prev.find(m => m.slotId === fromSlotId);
      const toMapping = prev.find(m => m.slotId === toSlotId);
      
      return prev.map(m => {
        if (m.slotId === fromSlotId) {
          return { ...m, widgetId: toMapping?.widgetId || null };
        }
        if (m.slotId === toSlotId) {
          return { ...m, widgetId: fromMapping?.widgetId || null };
        }
        return m;
      });
    });
  }, []);

  const handleSave = useCallback(() => {
    saveMutation.mutate({
      presetId: localPresetId,
      slotsMapping: localMapping,
    });
  }, [localPresetId, localMapping, saveMutation]);

  const handleReset = useCallback(() => {
    if (userLayout) {
      setLocalPresetId(userLayout.presetId);
      setLocalMapping(userLayout.slotsMapping || []);
    }
    setIsEditing(false);
  }, [userLayout]);

  const isLoading = presetsLoading || widgetsLoading || layoutLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className={`w-8 h-8 animate-spin ${isDark ? "text-purple-400" : "text-purple-600"}`} />
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
            Мои виджеты
          </h2>
          
          <div className="flex items-center gap-2 relative">
            {isEditing ? (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowPresetSelector(!showPresetSelector)}
                  className={`
                    px-4 py-2 rounded-xl flex items-center gap-2
                    ${isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}
                  `}
                  data-testid="button-select-preset"
                >
                  <Grid3X3 className="w-4 h-4" />
                  Сетка
                </motion.button>
                
                <AnimatePresence>
                  <PresetSelector
                    presets={presets}
                    currentPresetId={localPresetId}
                    onSelect={handlePresetChange}
                    isDark={isDark}
                    isOpen={showPresetSelector}
                    onClose={() => setShowPresetSelector(false)}
                  />
                </AnimatePresence>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleReset}
                  className={`
                    px-4 py-2 rounded-xl flex items-center gap-2
                    ${isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}
                  `}
                  data-testid="button-reset-layout"
                >
                  <RotateCcw className="w-4 h-4" />
                  Сбросить
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="px-4 py-2 rounded-xl flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white disabled:opacity-50"
                  data-testid="button-save-layout"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Сохранить
                </motion.button>
              </>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsEditing(true)}
                className={`
                  px-4 py-2 rounded-xl flex items-center gap-2
                  ${isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}
                `}
                data-testid="button-customize-grid"
              >
                <Settings className="w-4 h-4" />
                Настроить
              </motion.button>
            )}
          </div>
        </div>

        {isEditing && (
          <p className={`text-sm ${isDark ? "text-white/50" : "text-gray-500"}`}>
            Перетащите виджеты для изменения порядка. Нажмите на пустой слот для добавления виджета.
          </p>
        )}

        <div 
          className="grid gap-4"
          style={{ 
            gridTemplateColumns: `repeat(${currentPreset?.columns || 12}, 1fr)`,
          }}
        >
          {slots.map((slot) => (
            <DraggableSlot
              key={slot.slotId}
              slot={slot}
              mapping={localMapping.find(m => m.slotId === slot.slotId)}
              widgets={widgetsCatalog}
              isDark={isDark}
              isEditing={isEditing}
              columns={currentPreset?.columns || 12}
              onSelectWidget={handleSelectWidget}
              onRemoveWidget={handleRemoveWidget}
              onSwapSlots={handleSwapSlots}
            />
          ))}
        </div>

        <AnimatePresence>
          <WidgetSelector
            widgets={widgetsCatalog}
            onSelect={handleWidgetSelected}
            isDark={isDark}
            isOpen={showWidgetSelector}
            onClose={() => {
              setShowWidgetSelector(false);
              setSelectedSlotId(null);
            }}
          />
        </AnimatePresence>
      </div>
    </DndProvider>
  );
}
