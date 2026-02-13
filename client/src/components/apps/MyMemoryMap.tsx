import { useState, useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import {
  Plus,
  MapPin,
  Search,
  X,
  Save,
  Trash2,
  Share2,
  Users,
  Loader2,
  Image as ImageIcon,
  Type,
  GripVertical,
  Check,
  Calendar,
  Sparkles,
  Navigation,
  Menu,
  Edit3,
  Paperclip,
  FileText,
  Play,
  ChevronLeft,
  ChevronRight,
  Video,
  File,
  Archive,
} from "lucide-react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

type GalleryMediaItem = { 
  id: string; 
  url: string; 
  file?: File; 
  mediaType: "image" | "video";
  existingMediaId?: string;
};

type FileAttachment = {
  id: string;
  url: string;
  file?: File;
  name: string;
  size: number;
  mimeType: string;
  existingMediaId?: string;
};

type ContentBlock = 
  | { id: string; type: "text"; content: string }
  | { id: string; type: "gallery"; media: GalleryMediaItem[] }
  | { id: string; type: "files"; files: FileAttachment[] };

type StoredBlock = 
  | { id: string; type: "text"; content: string }
  | { id: string; type: "gallery"; mediaIds: string[] }
  | { id: string; type: "files"; fileIds: string[] };

interface MediaItem {
  id: string;
  type: "photo" | "video" | "file";
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  url?: string;
  fileId?: string;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType === "application/pdf") return FileText;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("archive")) return Archive;
  return File;
};
const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface MemoryMarker {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  icon: string;
  color: string;
  eventDate: string | null;
  media: MediaItem[];
  blocks: StoredBlock[];
  isOwner: boolean;
  sharedWith: { userId: string; username?: string; role: string }[];
  createdAt: string;
}

interface MyMemoryMapProps {
  isDark: boolean;
  onClose?: () => void;
}

type UIMode = "browse" | "selecting" | "editing" | "viewing";

const MARKER_ICONS = ["📍", "🏠", "❤️", "🎉", "🏖️", "🏔️", "🌴", "🎵", "🍕", "✈️", "🚗", "📸", "🎂", "💼", "🏛️", "⛪"];
const MARKER_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899"];

const glassStyle = (isDark: boolean) => `
  ${isDark 
    ? "bg-slate-900/80 border-white/10" 
    : "bg-white/80 border-black/5"
  } backdrop-blur-xl border shadow-2xl
`;

type ViewerMediaItem = {
  url: string;
  type: "image" | "video";
};

function MediaViewer({
  media,
  initialIndex,
  onClose,
  onDelete,
}: {
  media: ViewerMediaItem[];
  initialIndex: number;
  onClose: () => void;
  onDelete?: (index: number) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  useEffect(() => {
    if (media.length === 0) {
      onClose();
      return;
    }
    if (currentIndex >= media.length) {
      setCurrentIndex(Math.max(0, media.length - 1));
    }
  }, [media.length, currentIndex, onClose]);
  
  const currentMedia = media[currentIndex];
  if (!currentMedia) return null;

  const nextMedia = () => setCurrentIndex((prev) => (prev + 1) % media.length);
  const prevMedia = () => setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") nextMedia();
    if (e.key === "ArrowLeft") prevMedia();
    if (e.key === "Escape") onClose();
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 z-[99999] flex items-center justify-center backdrop-blur-md"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onClose}
        className="absolute top-6 right-6 p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors z-10"
      >
        <X className="w-6 h-6" />
      </motion.button>

      {onDelete && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(currentIndex);
          }}
          className="absolute top-6 right-20 p-2.5 bg-red-500/80 hover:bg-red-500 text-white rounded-xl transition-colors z-10"
        >
          <Trash2 className="w-6 h-6" />
        </motion.button>
      )}

      {media.length > 1 && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 text-white text-sm rounded-full z-10 flex items-center gap-2">
          {currentMedia.type === "video" && <Play className="w-4 h-4 fill-current" />}
          {currentIndex + 1} / {media.length}
        </div>
      )}

      <div onClick={(e) => e.stopPropagation()} className="max-w-[90vw] max-h-[90vh]">
        {currentMedia.type === "video" ? (
          <video
            key={currentMedia.url}
            src={currentMedia.url}
            controls
            autoPlay
            className="max-w-[90vw] max-h-[90vh] rounded-xl"
          />
        ) : (
          <img
            src={currentMedia.url}
            alt={`Media ${currentIndex + 1}`}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl"
          />
        )}
      </div>

      {media.length > 1 && (
        <>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); prevMedia(); }}
            className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); nextMedia(); }}
            className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </motion.button>
        </>
      )}

      {media.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {media.map((item, index) => (
            <button
              key={index}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); }}
              className={`rounded-full transition-all ${
                index === currentIndex
                  ? item.type === "video" ? "bg-green-500 w-6 h-2" : "bg-purple-500 w-6 h-2"
                  : "bg-white/40 hover:bg-white/60 w-2 h-2"
              }`}
            />
          ))}
        </div>
      )}
    </motion.div>,
    document.body
  );
}

const createCustomIcon = (icon: string, color: string, isSelected: boolean = false, isPulsing: boolean = false) => {
  const size = isSelected ? 48 : 40;
  const pulseClass = isPulsing ? "marker-pulse" : "";
  return L.divIcon({
    className: `custom-marker ${pulseClass}`,
    html: `
      <div class="marker-container ${isSelected ? 'selected' : ''}" style="
        width: ${size}px; 
        height: ${size}px; 
        position: relative;
      ">
        ${isPulsing ? `
          <div style="
            position: absolute;
            inset: -8px;
            background: ${color}40;
            border-radius: 50%;
            animation: pulse-ring 1.5s ease-out infinite;
          "></div>
        ` : ''}
        <div style="
          background: linear-gradient(135deg, ${color}, ${color}dd);
          width: ${size}px; 
          height: ${size}px; 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: ${isSelected ? 24 : 20}px; 
          box-shadow: 0 4px 20px ${color}60, 0 2px 8px rgba(0,0,0,0.2);
          border: 3px solid white;
          transition: all 0.3s ease;
          ${isSelected ? 'transform: scale(1.1);' : ''}
        ">${icon}</div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

function LocationMarker({ 
  onLocationSelect, 
  isSelecting 
}: { 
  onLocationSelect: (lat: number, lng: number) => void;
  isSelecting: boolean;
}) {
  const map = useMap();
  
  useEffect(() => {
    if (isSelecting) {
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.getContainer().style.cursor = '';
    }
    return () => {
      map.getContainer().style.cursor = '';
    };
  }, [isSelecting, map]);
  
  useMapEvents({
    click(e) {
      if (isSelecting) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function MapController({ center, zoom }: { center: [number, number] | null; zoom?: number }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 12, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  
  return null;
}

function BlockEditor({ 
  blocks, 
  setBlocks, 
  isDark 
}: { 
  blocks: ContentBlock[]; 
  setBlocks: (blocks: ContentBlock[]) => void;
  isDark: boolean;
}) {
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerMedia, setViewerMedia] = useState<ViewerMediaItem[]>([]);
  const [viewerBlockId, setViewerBlockId] = useState<string | null>(null);

  const addTextBlock = () => {
    const newBlock: ContentBlock = {
      id: `text-${Date.now()}`,
      type: "text",
      content: "",
    };
    setBlocks([...blocks, newBlock]);
  };

  const addGalleryBlock = () => {
    const newBlock: ContentBlock = {
      id: `gallery-${Date.now()}`,
      type: "gallery",
      media: [],
    };
    setBlocks([...blocks, newBlock]);
    setActiveBlockId(newBlock.id);
    setTimeout(() => mediaInputRef.current?.click(), 100);
  };

  const addFilesBlock = () => {
    const newBlock: ContentBlock = {
      id: `files-${Date.now()}`,
      type: "files",
      files: [],
    };
    setBlocks([...blocks, newBlock]);
    setActiveBlockId(newBlock.id);
    setTimeout(() => fileInputRef.current?.click(), 100);
  };

  const updateBlock = (id: string, updates: Partial<ContentBlock>) => {
    setBlocks(blocks.map(block => 
      block.id === id ? { ...block, ...updates } as ContentBlock : block
    ));
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(block => block.id !== id));
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !activeBlockId) return;
    
    const files = Array.from(e.target.files);
    const block = blocks.find(b => b.id === activeBlockId);
    if (!block || block.type !== "gallery") return;

    const newMedia: GalleryMediaItem[] = files.map(file => ({
      id: `media-${Date.now()}-${Math.random()}`,
      url: URL.createObjectURL(file),
      file,
      mediaType: file.type.startsWith("video/") ? "video" : "image",
    }));

    updateBlock(activeBlockId, { media: [...block.media, ...newMedia] });
    e.target.value = "";
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !activeBlockId) return;
    
    const files = Array.from(e.target.files);
    const block = blocks.find(b => b.id === activeBlockId);
    if (!block || block.type !== "files") return;

    const newFiles: FileAttachment[] = files.map(file => ({
      id: `file-${Date.now()}-${Math.random()}`,
      url: URL.createObjectURL(file),
      file,
      name: file.name,
      size: file.size,
      mimeType: file.type,
    }));

    updateBlock(activeBlockId, { files: [...block.files, ...newFiles] });
    e.target.value = "";
  };

  const openViewer = (blockId: string, index: number, media: GalleryMediaItem[]) => {
    setViewerBlockId(blockId);
    setViewerIndex(index);
    setViewerMedia(media.map(m => ({ url: m.url, type: m.mediaType })));
    setViewerOpen(true);
  };

  const handleDeleteFromViewer = (index: number) => {
    if (!viewerBlockId) return;
    const block = blocks.find(b => b.id === viewerBlockId);
    if (!block || block.type !== "gallery") return;
    
    const media = block.media || [];
    const newMedia = media.filter((_, i) => i !== index);
    updateBlock(viewerBlockId, { media: newMedia });
    setViewerMedia(newMedia.map(m => ({ url: m.url, type: m.mediaType })));
    
    if (newMedia.length === 0) setViewerOpen(false);
  };

  const renderGalleryBlock = (block: ContentBlock & { type: "gallery" }) => {
    const media = block.media || [];
    if (media.length === 0) {
      return (
        <button
          onClick={() => {
            setActiveBlockId(block.id);
            mediaInputRef.current?.click();
          }}
          className={`w-full py-8 rounded-lg border-2 border-dashed flex flex-col items-center gap-2 transition-colors ${
            isDark 
              ? "border-slate-600 hover:border-slate-500 text-slate-500" 
              : "border-gray-300 hover:border-gray-400 text-gray-400"
          }`}
        >
          <Video className="w-8 h-8" />
          <span className="text-sm">Фото и видео</span>
        </button>
      );
    }

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          {media.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative aspect-square rounded-lg overflow-hidden group/media cursor-pointer"
              onClick={() => openViewer(block.id, index, media)}
            >
              {item.mediaType === "video" ? (
                <>
                  <video
                    src={item.url}
                    className="w-full h-full object-cover"
                    preload="metadata"
                    muted
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="p-2 bg-white/90 rounded-full">
                      <Play className="w-4 h-4 text-gray-800 fill-current" />
                    </div>
                  </div>
                </>
              ) : (
                <img src={item.url} alt="" className="w-full h-full object-cover" />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateBlock(block.id, {
                    media: media.filter(m => m.id !== item.id),
                  });
                }}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover/media:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
          <button
            onClick={() => {
              setActiveBlockId(block.id);
              mediaInputRef.current?.click();
            }}
            className={`aspect-square rounded-lg border-2 border-dashed flex items-center justify-center transition-colors ${
              isDark 
                ? "border-slate-600 hover:border-slate-500 text-slate-500" 
                : "border-gray-300 hover:border-gray-400 text-gray-400"
            }`}
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>
    );
  };

  const renderFilesBlock = (block: ContentBlock & { type: "files" }) => {
    if (block.files.length === 0) {
      return (
        <button
          onClick={() => {
            setActiveBlockId(block.id);
            fileInputRef.current?.click();
          }}
          className={`w-full py-8 rounded-lg border-2 border-dashed flex flex-col items-center gap-2 transition-colors ${
            isDark 
              ? "border-slate-600 hover:border-slate-500 text-slate-500" 
              : "border-gray-300 hover:border-gray-400 text-gray-400"
          }`}
        >
          <Paperclip className="w-8 h-8" />
          <span className="text-sm">PDF, архивы, файлы</span>
        </button>
      );
    }

    return (
      <div className="space-y-2">
        {block.files.map((file) => {
          const FileIcon = getFileIcon(file.mimeType);
          return (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-3 p-3 rounded-lg group/file ${
                isDark ? "bg-slate-700/50" : "bg-gray-100"
              }`}
            >
              <div className={`p-2 rounded-lg ${isDark ? "bg-slate-600" : "bg-gray-200"}`}>
                <FileIcon className={`w-5 h-5 ${isDark ? "text-slate-300" : "text-gray-600"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                  {file.name}
                </p>
                <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  {formatFileSize(file.size)}
                </p>
              </div>
              <button
                onClick={() => {
                  updateBlock(block.id, {
                    files: block.files.filter(f => f.id !== file.id),
                  });
                }}
                className={`p-1.5 rounded-lg opacity-0 group-hover/file:opacity-100 transition-opacity ${
                  isDark ? "hover:bg-slate-600 text-slate-400" : "hover:bg-gray-200 text-gray-500"
                }`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
        <button
          onClick={() => {
            setActiveBlockId(block.id);
            fileInputRef.current?.click();
          }}
          className={`w-full py-3 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 transition-colors ${
            isDark 
              ? "border-slate-600 hover:border-slate-500 text-slate-500" 
              : "border-gray-300 hover:border-gray-400 text-gray-400"
          }`}
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">Добавить файл</span>
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <input
        ref={mediaInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={handleMediaUpload}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.zip,.rar,.7z,.tar,.gz,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
        className="hidden"
        onChange={handleFileUpload}
      />
      
      <AnimatePresence>
        {viewerOpen && (
          <MediaViewer
            media={viewerMedia}
            initialIndex={viewerIndex}
            onClose={() => setViewerOpen(false)}
            onDelete={handleDeleteFromViewer}
          />
        )}
      </AnimatePresence>
      
      <Reorder.Group 
        axis="y" 
        values={blocks} 
        onReorder={setBlocks}
        className="space-y-3"
      >
        <AnimatePresence mode="popLayout">
          {blocks.map((block) => (
            <Reorder.Item
              key={block.id}
              value={block}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={`group relative rounded-xl ${
                isDark ? "bg-slate-800/50" : "bg-gray-50"
              } p-3`}
            >
              <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                <GripVertical className={`w-4 h-4 ${isDark ? "text-slate-500" : "text-gray-400"}`} />
              </div>
              
              <div className="pl-5">
                {block.type === "text" && (
                  <textarea
                    value={block.content}
                    onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                    placeholder="Напишите текст..."
                    className={`w-full min-h-[80px] resize-none bg-transparent border-0 focus:outline-none focus:ring-0 text-sm ${
                      isDark ? "text-white placeholder-slate-500" : "text-gray-900 placeholder-gray-400"
                    }`}
                    data-testid={`block-text-${block.id}`}
                  />
                )}
                {block.type === "gallery" && renderGalleryBlock(block)}
                {block.type === "files" && renderFilesBlock(block)}
              </div>
              
              <button
                onClick={() => removeBlock(block.id)}
                className={`absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${
                  isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-200 text-gray-500"
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </Reorder.Item>
          ))}
        </AnimatePresence>
      </Reorder.Group>
      
      <div className="flex gap-2 pt-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={addTextBlock}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            isDark 
              ? "bg-slate-800 hover:bg-slate-700 text-slate-300" 
              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
          }`}
          data-testid="button-add-text-block"
        >
          <Type className="w-4 h-4" />
          Текст
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={addGalleryBlock}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            isDark 
              ? "bg-slate-800 hover:bg-slate-700 text-slate-300" 
              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
          }`}
          data-testid="button-add-gallery-block"
        >
          <ImageIcon className="w-4 h-4" />
          Галерея
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={addFilesBlock}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            isDark 
              ? "bg-slate-800 hover:bg-slate-700 text-slate-300" 
              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
          }`}
          data-testid="button-add-files-block"
        >
          <Paperclip className="w-4 h-4" />
          Файлы
        </motion.button>
      </div>
    </div>
  );
}

export default function MyMemoryMap({ isDark }: MyMemoryMapProps) {
  const [markers, setMarkers] = useState<MemoryMarker[]>([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [uiMode, setUiMode] = useState<UIMode>("browse");
  const [pendingPosition, setPendingPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showMemoriesList, setShowMemoriesList] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLogin, setShareLogin] = useState("");
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  
  const [viewModeViewerOpen, setViewModeViewerOpen] = useState(false);
  const [viewModeViewerIndex, setViewModeViewerIndex] = useState(0);
  const [viewModeViewerMedia, setViewModeViewerMedia] = useState<{ url: string; type: "image" | "video" }[]>([]);
  
  const [editorData, setEditorData] = useState({
    title: "",
    icon: "📍",
    color: "#ef4444",
    eventDate: "",
    blocks: [] as ContentBlock[],
  });

  const selectedMarker = markers.find(m => m.id === selectedMarkerId);

  const fetchMarkers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/memory-map/markers", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMarkers(data);
      }
    } catch (error) {
      console.error("Failed to fetch markers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocateUser = async () => {
    setIsLocating(true);
    try {
      const res = await fetch("https://ipapi.co/json/");
      if (res.ok) {
        const data = await res.json();
        if (data.latitude && data.longitude) {
          setMapCenter([data.latitude, data.longitude]);
        }
      }
    } catch (error) {
      console.error("IP geolocation failed:", error);
    }
    setIsLocating(false);
  };

  useEffect(() => {
    fetchMarkers();
    handleLocateUser();
  }, []);

  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    if (uiMode === "selecting") {
      setPendingPosition({ lat, lng });
      setMapCenter([lat, lng]);
      setUiMode("editing");
    } else if (uiMode === "editing") {
      setPendingPosition({ lat, lng });
      setMapCenter([lat, lng]);
    }
  }, [uiMode]);

  const handleStartCreating = () => {
    setUiMode("selecting");
    setSelectedMarkerId(null);
    setPendingPosition(null);
    setEditorData({
      title: "",
      icon: "📍",
      color: "#ef4444",
      eventDate: "",
      blocks: [],
    });
    setShowMemoriesList(false);
  };

  const handleCancelCreating = () => {
    setUiMode("browse");
    setPendingPosition(null);
    setEditingMarkerId(null);
    setEditorData({
      title: "",
      icon: "📍",
      color: "#ef4444",
      eventDate: "",
      blocks: [],
    });
  };

  const handleStartEditing = (marker: MemoryMarker) => {
    setEditingMarkerId(marker.id);
    setPendingPosition({ lat: Number(marker.lat), lng: Number(marker.lng) });
    
    const blocks: ContentBlock[] = [];
    
    if (marker.blocks && marker.blocks.length > 0) {
      for (const storedBlock of marker.blocks) {
        if (storedBlock.type === "text") {
          blocks.push({
            id: storedBlock.id,
            type: "text",
            content: storedBlock.content || "",
          });
        } else if (storedBlock.type === "gallery") {
          blocks.push({
            id: storedBlock.id,
            type: "gallery",
            media: (storedBlock.mediaIds || []).map((mediaId: string) => {
              const mediaItem = marker.media?.find(m => m.id === mediaId);
              return {
                id: mediaId,
                url: mediaItem?.url || mediaItem?.storagePath || "",
                mediaType: (mediaItem?.mimeType?.startsWith("video/") ? "video" : "image") as "image" | "video",
                existingMediaId: mediaId,
              };
            }),
          });
        } else if (storedBlock.type === "files") {
          blocks.push({
            id: storedBlock.id,
            type: "files",
            files: (storedBlock.fileIds || []).map((fileId: string) => {
              const fileItem = marker.media?.find(m => m.id === fileId);
              return {
                id: fileId,
                url: fileItem?.url || fileItem?.storagePath || "",
                name: fileItem?.originalName || fileItem?.filename || "file",
                size: fileItem?.size || 0,
                mimeType: fileItem?.mimeType || "",
                existingMediaId: fileId,
              };
            }),
          });
        }
      }
    } else {
      if (marker.description) {
        blocks.push({
          id: `text-${Date.now()}`,
          type: "text",
          content: marker.description,
        });
      }
      if (marker.media && marker.media.length > 0) {
        const photos = marker.media.filter(m => m.type === "photo" || m.type === "video");
        const files = marker.media.filter(m => m.type === "file");
        
        if (photos.length > 0) {
          blocks.push({
            id: `gallery-${Date.now()}`,
            type: "gallery",
            media: photos.map(m => ({
              id: m.id,
              url: m.url || m.storagePath || "",
              mediaType: (m.mimeType?.startsWith("video/") ? "video" : "image") as "image" | "video",
              existingMediaId: m.id,
            })),
          });
        }
        
        if (files.length > 0) {
          blocks.push({
            id: `files-${Date.now()}`,
            type: "files",
            files: files.map(f => ({
              id: f.id,
              url: f.url || f.storagePath || "",
              name: f.originalName || f.filename,
              size: f.size,
              mimeType: f.mimeType,
              existingMediaId: f.id,
            })),
          });
        }
      }
    }
    
    setEditorData({
      title: marker.title,
      icon: marker.icon,
      color: marker.color,
      eventDate: marker.eventDate ? new Date(marker.eventDate).toISOString().split("T")[0] : "",
      blocks,
    });
    
    setUiMode("editing");
    setSelectedMarkerId(null);
  };

  const handleSaveMarker = async () => {
    if (!pendingPosition || !editorData.title) return;
    
    setIsSaving(true);
    try {
      const description = editorData.blocks
        .filter(b => b.type === "text")
        .map(b => (b as { type: "text"; content: string }).content)
        .join("\n\n");

      const isEditing = !!editingMarkerId;
      const markerId = editingMarkerId;
      
      let targetMarkerId: string;
      
      if (isEditing && markerId) {
        const res = await fetch(`/api/memory-map/markers/${markerId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: editorData.title,
            description,
            lat: pendingPosition.lat,
            lng: pendingPosition.lng,
            icon: editorData.icon,
            color: editorData.color,
            eventDate: editorData.eventDate || null,
          }),
        });
        
        if (!res.ok) throw new Error("Failed to update marker");
        targetMarkerId = markerId;
      } else {
        const res = await fetch("/api/memory-map/markers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: editorData.title,
            description,
            lat: pendingPosition.lat,
            lng: pendingPosition.lng,
            icon: editorData.icon,
            color: editorData.color,
            eventDate: editorData.eventDate || null,
          }),
        });
        
        if (!res.ok) throw new Error("Failed to create marker");
        const createdMarker = await res.json();
        targetMarkerId = createdMarker.id;
      }
      
      const storedBlocks: StoredBlock[] = [];
      
      for (const block of editorData.blocks) {
        if (block.type === "text") {
          storedBlocks.push({
            id: block.id,
            type: "text",
            content: block.content,
          });
        } else if (block.type === "gallery") {
          const mediaIds: string[] = [];
          
          for (const item of block.media) {
            if (item.file) {
              const formData = new FormData();
              formData.append("file", item.file);
              formData.append("type", item.mediaType === "video" ? "video" : "photo");
              
              const mediaRes = await fetch(`/api/memory-map/markers/${targetMarkerId}/media`, {
                method: "POST",
                credentials: "include",
                body: formData,
              });
              
              if (mediaRes.ok) {
                const uploadedMedia = await mediaRes.json();
                mediaIds.push(uploadedMedia.id);
              }
            } else if (item.existingMediaId) {
              mediaIds.push(item.existingMediaId);
            }
          }
          
          if (mediaIds.length > 0) {
            storedBlocks.push({
              id: block.id,
              type: "gallery",
              mediaIds,
            });
          }
        } else if (block.type === "files") {
          const fileIds: string[] = [];
          
          for (const file of block.files) {
            if (file.file) {
              const formData = new FormData();
              formData.append("file", file.file);
              formData.append("type", "file");
              
              const mediaRes = await fetch(`/api/memory-map/markers/${targetMarkerId}/media`, {
                method: "POST",
                credentials: "include",
                body: formData,
              });
              
              if (mediaRes.ok) {
                const uploadedMedia = await mediaRes.json();
                fileIds.push(uploadedMedia.id);
              }
            } else if (file.existingMediaId) {
              fileIds.push(file.existingMediaId);
            }
          }
          
          if (fileIds.length > 0) {
            storedBlocks.push({
              id: block.id,
              type: "files",
              fileIds,
            });
          }
        }
      }
      
      if (storedBlocks.length > 0 || isEditing) {
        await fetch(`/api/memory-map/markers/${targetMarkerId}/blocks`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ blocks: storedBlocks }),
        });
      }
      
      await fetchMarkers();
      setUiMode("browse");
      setPendingPosition(null);
      setEditingMarkerId(null);
      setEditorData({
        title: "",
        icon: "📍",
        color: "#ef4444",
        eventDate: "",
        blocks: [],
      });
    } catch (error) {
      console.error("Failed to save marker:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMarker = async (markerId: string) => {
    try {
      const res = await fetch(`/api/memory-map/markers/${markerId}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (res.ok) {
        setMarkers(markers.filter(m => m.id !== markerId));
        setSelectedMarkerId(null);
        setUiMode("browse");
      }
    } catch (error) {
      console.error("Failed to delete marker:", error);
    }
  };

  const handleShareMarker = async () => {
    if (!selectedMarkerId || !shareLogin) return;
    
    try {
      const res = await fetch(`/api/memory-map/markers/${selectedMarkerId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ login: shareLogin, role: "viewer" }),
      });
      
      if (res.ok) {
        await fetchMarkers();
        setShareLogin("");
        setShowShareModal(false);
      }
    } catch (error) {
      console.error("Failed to share marker:", error);
    }
  };

  const handleMarkerClick = (marker: MemoryMarker) => {
    setSelectedMarkerId(marker.id);
    setMapCenter([marker.lat, marker.lng]);
    setUiMode("viewing");
    setShowMemoriesList(false);
  };

  const filteredMarkers = markers.filter(m =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full w-full relative overflow-hidden">
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        .marker-pulse .marker-container::before {
          content: '';
          position: absolute;
          inset: -12px;
          border-radius: 50%;
          animation: pulse-ring 1.5s ease-out infinite;
        }
      `}</style>
      
      <MapContainer
        center={[48.8566, 2.3522]}
        zoom={4}
        className="h-full w-full"
        style={{ background: isDark ? "#0f172a" : "#f1f5f9" }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url={isDark
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          }
        />
        <LocationMarker onLocationSelect={handleLocationSelect} isSelecting={uiMode === "selecting" || uiMode === "editing"} />
        <MapController center={mapCenter} />
        
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            icon={createCustomIcon(
              marker.icon, 
              marker.color, 
              selectedMarkerId === marker.id,
              false
            )}
            eventHandlers={{
              click: () => handleMarkerClick(marker),
            }}
          />
        ))}
        
        {pendingPosition && (
          <Marker
            position={[pendingPosition.lat, pendingPosition.lng]}
            icon={createCustomIcon(editorData.icon, editorData.color, true, true)}
          />
        )}
      </MapContainer>

      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-3">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowMemoriesList(!showMemoriesList)}
          className={`p-3 rounded-2xl ${glassStyle(isDark)} transition-all`}
          data-testid="button-toggle-memories"
        >
          <Menu className={`w-5 h-5 ${isDark ? "text-white" : "text-gray-700"}`} />
        </motion.button>
        
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleStartCreating}
          disabled={uiMode === "selecting" || uiMode === "editing"}
          className={`p-3 rounded-2xl transition-all ${
            uiMode === "selecting" || uiMode === "editing"
              ? "bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/30"
              : glassStyle(isDark)
          }`}
          data-testid="button-add-memory"
        >
          <Plus className={`w-5 h-5 ${
            uiMode === "selecting" || uiMode === "editing" ? "text-white" : isDark ? "text-white" : "text-gray-700"
          }`} />
        </motion.button>
        
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLocateUser}
          disabled={isLocating}
          className={`p-3 rounded-2xl ${glassStyle(isDark)} transition-all ${isLocating ? "opacity-70" : ""}`}
          data-testid="button-locate-user"
        >
          {isLocating ? (
            <Loader2 className={`w-5 h-5 animate-spin ${isDark ? "text-white" : "text-gray-700"}`} />
          ) : (
            <Navigation className={`w-5 h-5 ${isDark ? "text-white" : "text-gray-700"}`} />
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {uiMode === "selecting" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000]"
          >
            <div className={`px-6 py-4 rounded-2xl ${glassStyle(isDark)} flex items-center gap-4`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                    Выберите место на карте
                  </p>
                  <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Кликните, чтобы добавить метку
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancelCreating}
                className={`p-2 rounded-xl ${isDark ? "hover:bg-slate-700" : "hover:bg-gray-100"} transition-colors`}
              >
                <X className={`w-5 h-5 ${isDark ? "text-slate-400" : "text-gray-500"}`} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMemoriesList && (
          <motion.div
            initial={{ opacity: 0, x: -300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`absolute top-4 left-20 bottom-4 w-80 z-[1000] rounded-3xl ${glassStyle(isDark)} overflow-hidden flex flex-col`}
          >
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className={`font-semibold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
                  Мои воспоминания
                </h2>
                <button
                  onClick={() => setShowMemoriesList(false)}
                  className={`p-1.5 rounded-lg ${isDark ? "hover:bg-slate-700" : "hover:bg-gray-100"}`}
                >
                  <X className={`w-4 h-4 ${isDark ? "text-slate-400" : "text-gray-500"}`} />
                </button>
              </div>
              
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-slate-400" : "text-gray-400"}`} />
                <input
                  type="text"
                  placeholder="Поиск..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-transparent border ${
                    isDark
                      ? "border-white/10 text-white placeholder-slate-500 focus:border-blue-500/50"
                      : "border-black/10 text-gray-900 placeholder-gray-400 focus:border-blue-500/50"
                  } focus:outline-none transition-colors`}
                  data-testid="input-search-memories"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className={`w-6 h-6 animate-spin ${isDark ? "text-slate-400" : "text-gray-400"}`} />
                </div>
              ) : filteredMarkers.length === 0 ? (
                <div className={`text-center py-12 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Пока нет воспоминаний</p>
                  <p className="text-sm mt-1 opacity-75">Нажмите + чтобы добавить</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredMarkers.map((marker, index) => (
                    <motion.div
                      key={marker.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleMarkerClick(marker)}
                      className={`p-3 rounded-2xl cursor-pointer transition-all ${
                        selectedMarkerId === marker.id
                          ? "bg-gradient-to-r from-blue-500/20 to-indigo-500/20 ring-1 ring-blue-500/50"
                          : isDark 
                            ? "bg-white/5 hover:bg-white/10" 
                            : "bg-black/5 hover:bg-black/10"
                      }`}
                      data-testid={`marker-item-${marker.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 shadow-lg"
                          style={{ background: `linear-gradient(135deg, ${marker.color}, ${marker.color}dd)` }}
                        >
                          {marker.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                            {marker.title}
                          </h4>
                          {marker.eventDate && (
                            <p className={`text-xs flex items-center gap-1 mt-0.5 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                              <Calendar className="w-3 h-3" />
                              {new Date(marker.eventDate).toLocaleDateString("ru-RU")}
                            </p>
                          )}
                          {marker.description && (
                            <p className={`text-xs mt-1.5 line-clamp-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                              {marker.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {marker.media && marker.media.filter(m => m.type === "photo").length > 0 && (
                              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                                isDark ? "bg-white/10 text-slate-300" : "bg-black/5 text-gray-600"
                              }`}>
                                <ImageIcon className="w-3 h-3" />
                                {marker.media.filter(m => m.type === "photo").length}
                              </span>
                            )}
                            {marker.sharedWith && marker.sharedWith.length > 0 && (
                              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                                isDark ? "bg-white/10 text-slate-300" : "bg-black/5 text-gray-600"
                              }`}>
                                <Users className="w-3 h-3" />
                                {marker.sharedWith.length}
                              </span>
                            )}
                            {!marker.isOwner && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                isDark ? "bg-purple-500/20 text-purple-300" : "bg-purple-100 text-purple-600"
                              }`}>
                                Доступ
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(uiMode === "editing" || uiMode === "viewing") && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`absolute top-4 right-4 bottom-4 w-96 z-[1000] rounded-3xl ${glassStyle(isDark)} overflow-hidden flex flex-col`}
          >
            {uiMode === "editing" ? (
              <>
                <div className={`p-4 border-b ${isDark ? "border-white/10" : "border-black/5"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className={`font-semibold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
                      {editingMarkerId ? "Редактирование" : "Новое воспоминание"}
                    </h2>
                    <button
                      onClick={handleCancelCreating}
                      className={`p-1.5 rounded-lg ${isDark ? "hover:bg-slate-700" : "hover:bg-gray-100"}`}
                    >
                      <X className={`w-4 h-4 ${isDark ? "text-slate-400" : "text-gray-500"}`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-green-500/20 to-emerald-500/20">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                        Место выбрано!
                      </p>
                      <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        {pendingPosition?.lat.toFixed(4)}, {pendingPosition?.lng.toFixed(4)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Название
                    </label>
                    <input
                      type="text"
                      value={editorData.title}
                      onChange={(e) => setEditorData({ ...editorData, title: e.target.value })}
                      placeholder="Как назовём это место?"
                      className={`w-full px-4 py-3 rounded-xl text-sm bg-transparent border ${
                        isDark
                          ? "border-white/10 text-white placeholder-slate-500 focus:border-blue-500/50"
                          : "border-black/10 text-gray-900 placeholder-gray-400 focus:border-blue-500/50"
                      } focus:outline-none transition-colors`}
                      data-testid="input-marker-title"
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Дата события
                    </label>
                    <input
                      type="date"
                      value={editorData.eventDate}
                      onChange={(e) => setEditorData({ ...editorData, eventDate: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl text-sm bg-transparent border ${
                        isDark
                          ? "border-white/10 text-white focus:border-blue-500/50"
                          : "border-black/10 text-gray-900 focus:border-blue-500/50"
                      } focus:outline-none transition-colors`}
                      data-testid="input-marker-date"
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Иконка
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {MARKER_ICONS.map((icon) => (
                        <motion.button
                          key={icon}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setEditorData({ ...editorData, icon })}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
                            editorData.icon === icon
                              ? "ring-2 ring-blue-500 bg-blue-500/20"
                              : isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5 hover:bg-black/10"
                          }`}
                        >
                          {icon}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Цвет
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {MARKER_COLORS.map((color) => (
                        <motion.button
                          key={color}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setEditorData({ ...editorData, color })}
                          className={`w-9 h-9 rounded-xl transition-all shadow-lg ${
                            editorData.color === color ? "ring-2 ring-offset-2 ring-blue-500" : ""
                          }`}
                          style={{ 
                            background: `linear-gradient(135deg, ${color}, ${color}dd)`,
                            boxShadow: `0 4px 12px ${color}40`
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Содержимое
                    </label>
                    <BlockEditor
                      blocks={editorData.blocks}
                      setBlocks={(blocks) => setEditorData({ ...editorData, blocks })}
                      isDark={isDark}
                    />
                  </div>
                </div>
                
                <div className={`p-4 border-t ${isDark ? "border-white/10" : "border-black/5"}`}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSaveMarker}
                    disabled={!editorData.title || isSaving}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    data-testid="button-save-marker"
                  >
                    {isSaving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    Сохранить воспоминание
                  </motion.button>
                </div>
              </>
            ) : selectedMarker && (
              <>
                <div className={`p-4 border-b ${isDark ? "border-white/10" : "border-black/5"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg"
                        style={{ background: `linear-gradient(135deg, ${selectedMarker.color}, ${selectedMarker.color}dd)` }}
                      >
                        {selectedMarker.icon}
                      </div>
                      <div>
                        <h2 className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                          {selectedMarker.title}
                        </h2>
                        {selectedMarker.eventDate && (
                          <p className={`text-sm flex items-center gap-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(selectedMarker.eventDate).toLocaleDateString("ru-RU", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => { setSelectedMarkerId(null); setUiMode("browse"); }}
                      className={`p-1.5 rounded-lg ${isDark ? "hover:bg-slate-700" : "hover:bg-gray-100"}`}
                    >
                      <X className={`w-4 h-4 ${isDark ? "text-slate-400" : "text-gray-500"}`} />
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selectedMarker.blocks && selectedMarker.blocks.length > 0 ? (
                    selectedMarker.blocks.map((block, blockIndex) => (
                      <motion.div
                        key={block.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: blockIndex * 0.05 }}
                      >
                        {block.type === "text" ? (
                          <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                            {block.content}
                          </p>
                        ) : block.type === "gallery" ? (
                          <div className="grid grid-cols-2 gap-2">
                            {(block.mediaIds || []).map((mediaId, idx) => {
                              const media = selectedMarker.media?.find(m => m.id === mediaId);
                              if (!media) return null;
                              const isVideo = media.mimeType?.startsWith("video/");
                              
                              const allGalleryMedia = (block.mediaIds || [])
                                .map((id: string) => selectedMarker.media?.find(m => m.id === id))
                                .filter(Boolean)
                                .map((m: any) => ({
                                  url: m.url || m.storagePath,
                                  type: m.mimeType?.startsWith("video/") ? "video" as const : "image" as const
                                }));
                              
                              return (
                                <motion.div
                                  key={mediaId}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: idx * 0.1 }}
                                  className="aspect-square rounded-xl overflow-hidden relative cursor-pointer"
                                  onClick={() => {
                                    setViewModeViewerMedia(allGalleryMedia);
                                    setViewModeViewerIndex(idx);
                                    setViewModeViewerOpen(true);
                                  }}
                                >
                                  {isVideo ? (
                                    <>
                                      <video
                                        src={media.url || media.storagePath}
                                        className="w-full h-full object-cover"
                                        muted
                                        preload="metadata"
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                        <div className="p-3 bg-white/90 rounded-full">
                                          <Play className="w-5 h-5 text-gray-800 fill-current" />
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <img
                                      src={media.url || media.storagePath}
                                      alt={media.originalName}
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                </motion.div>
                              );
                            })}
                          </div>
                        ) : block.type === "files" ? (
                          <div className="space-y-2">
                            {(block.fileIds || []).map((fileId) => {
                              const file = selectedMarker.media?.find(m => m.id === fileId);
                              if (!file) return null;
                              return (
                                <a
                                  key={fileId}
                                  href={file.url || file.storagePath}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                                    isDark 
                                      ? "bg-white/5 hover:bg-white/10" 
                                      : "bg-black/5 hover:bg-black/10"
                                  }`}
                                >
                                  <FileText className={`w-5 h-5 ${isDark ? "text-slate-400" : "text-gray-500"}`} />
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                                      {file.originalName}
                                    </p>
                                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                                      {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                  </div>
                                </a>
                              );
                            })}
                          </div>
                        ) : null}
                      </motion.div>
                    ))
                  ) : (
                    <>
                      {selectedMarker.description && (
                        <p className={`text-sm leading-relaxed ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                          {selectedMarker.description}
                        </p>
                      )}
                      
                      {selectedMarker.media && selectedMarker.media.filter(m => m.type === "photo").length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          {selectedMarker.media.filter(m => m.type === "photo").map((photo, index) => (
                            <motion.div
                              key={photo.id}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.1 }}
                              className="aspect-square rounded-xl overflow-hidden"
                            >
                              <img
                                src={photo.url || `/uploads/MyMemoryMap/photos/${photo.filename}`}
                                alt={photo.originalName}
                                className="w-full h-full object-cover"
                              />
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  
                  {selectedMarker.sharedWith && selectedMarker.sharedWith.length > 0 && (
                    <div>
                      <h4 className={`text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                        Доступ открыт для
                      </h4>
                      <div className="space-y-2">
                        {selectedMarker.sharedWith.map((share) => (
                          <div
                            key={share.userId}
                            className={`flex items-center justify-between p-2 rounded-xl ${
                              isDark ? "bg-white/5" : "bg-black/5"
                            }`}
                          >
                            <span className={`text-sm ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                              {share.username || share.userId}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              isDark ? "bg-white/10 text-slate-400" : "bg-black/5 text-gray-500"
                            }`}>
                              {share.role === "editor" ? "Редактор" : "Просмотр"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {selectedMarker.isOwner && (
                  <div className={`p-3 border-t ${isDark ? "border-white/10" : "border-black/5"} flex items-center justify-center gap-3`}>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleStartEditing(selectedMarker)}
                      className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30"
                      data-testid="button-edit-marker"
                      title="Редактировать"
                    >
                      <Edit3 className="w-5 h-5" />
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowShareModal(true)}
                      className={`p-3 rounded-xl transition-colors ${
                        isDark 
                          ? "bg-white/10 hover:bg-white/15 text-white" 
                          : "bg-black/5 hover:bg-black/10 text-gray-700"
                      }`}
                      title="Поделиться"
                    >
                      <Share2 className="w-5 h-5" />
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDeleteMarker(selectedMarker.id)}
                      className="p-3 rounded-xl text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="w-5 h-5" />
                    </motion.button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showShareModal && selectedMarker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[1100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-80 p-6 rounded-3xl ${glassStyle(isDark)}`}
            >
              <h3 className={`font-semibold text-lg mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                Поделиться
              </h3>
              <input
                type="text"
                value={shareLogin}
                onChange={(e) => setShareLogin(e.target.value)}
                placeholder="Логин пользователя"
                className={`w-full px-4 py-3 rounded-xl text-sm bg-transparent border mb-4 ${
                  isDark
                    ? "border-white/10 text-white placeholder-slate-500"
                    : "border-black/10 text-gray-900 placeholder-gray-400"
                } focus:outline-none focus:border-blue-500/50`}
                data-testid="input-share-login"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowShareModal(false)}
                  className={`flex-1 py-2.5 rounded-xl font-medium transition-colors ${
                    isDark ? "bg-white/10 text-white" : "bg-black/5 text-gray-900"
                  }`}
                >
                  Отмена
                </button>
                <button
                  onClick={handleShareMarker}
                  disabled={!shareLogin}
                  className="flex-1 py-2.5 rounded-xl font-medium bg-gradient-to-r from-blue-500 to-indigo-500 text-white disabled:opacity-50"
                  data-testid="button-confirm-share"
                >
                  Поделиться
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {viewModeViewerOpen && viewModeViewerMedia.length > 0 && (
        <MediaViewer
          media={viewModeViewerMedia}
          initialIndex={viewModeViewerIndex}
          onClose={() => setViewModeViewerOpen(false)}
        />
      )}
    </div>
  );
}
