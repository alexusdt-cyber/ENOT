import { useState, useEffect, useRef } from "react";
import { RoadMap, Milestone, Category } from "../App";
import { Plus, Trash2, Check, Circle, X, Image as ImageIcon, ChevronLeft, ChevronRight, Target, Flag, Sparkles, Route, Clock, FileText, Download, Eye, Video, Play } from "lucide-react";
import { DatePickerInput } from "./ui/date-picker-input";
import { motion, AnimatePresence } from "framer-motion";

// Media types and utilities
type MediaItem = {
  type: "image" | "video";
  url: string;
  name?: string;
  size?: number;
};

function combineMedia(images: string[] | undefined, videos: string[] | undefined): MediaItem[] {
  const media: MediaItem[] = [];
  
  // Add images
  if (images && Array.isArray(images)) {
    images.forEach((url) => {
      media.push({ type: "image", url });
    });
  }
  
  // Add videos
  if (videos && Array.isArray(videos)) {
    videos.forEach((videoStr) => {
      try {
        const video = typeof videoStr === 'string' ? JSON.parse(videoStr) : videoStr;
        media.push({ 
          type: "video", 
          url: video.url, 
          name: video.name, 
          size: video.size 
        });
      } catch {
        // Skip invalid video entries
      }
    });
  }
  
  return media;
}

interface RoadMapEditorProps {
  roadMap: RoadMap;
  onUpdateRoadMap: (roadmap: RoadMap) => void;
  onAddMilestone: (roadmapId: string) => Promise<void>;
  onUpdateMilestone: (roadmapId: string, milestoneId: string, updates: Partial<Milestone>) => Promise<void>;
  onDeleteMilestone: (roadmapId: string, milestoneId: string) => Promise<void>;
  roadmapCategories?: any[];
  onAddRoadmapCategory?: (name: string, icon?: string, color?: string) => Promise<any>;
  onAddCategory?: (category: Category) => void;
  isDark?: boolean;
}

const AnimatedMilestoneCheckbox = ({ 
  completed, 
  onClick, 
  isDark: _isDark 
}: { 
  completed: boolean; 
  onClick: () => void;
  isDark: boolean;
}) => {
  const [particles, setParticles] = useState<Array<{ id: number; angle: number; distance: number; size: number; color: string }>>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const colors = ['#8B5CF6', '#A78BFA', '#C4B5FD', '#10B981', '#34D399', '#6EE7B7'];

  const handleClick = () => {
    if (!completed) {
      const newParticles = Array.from({ length: 14 }, (_, i) => ({
        id: Date.now() + i,
        angle: (360 / 14) * i + Math.random() * 20,
        distance: 30 + Math.random() * 25,
        size: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)]
      }));
      setParticles(newParticles);
      setIsAnimating(true);
      setTimeout(() => {
        setParticles([]);
        setIsAnimating(false);
      }, 700);
    }
    onClick();
  };

  return (
    <div className="relative">
      <motion.button
        onClick={handleClick}
        className="relative w-12 h-12 rounded-full flex items-center justify-center transition-all z-10 overflow-visible"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={{
          boxShadow: completed 
            ? '0 8px 24px rgba(139, 92, 246, 0.5)' 
            : '0 8px 24px rgba(251, 146, 60, 0.5)'
        }}
        style={{
          background: completed 
            ? 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 50%, #6D28D9 100%)'
            : 'linear-gradient(135deg, #FB923C 0%, #F97316 50%, #EA580C 100%)'
        }}
      >
        <AnimatePresence mode="wait">
          {completed ? (
            <motion.div
              key="check"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <Check className="w-6 h-6 text-white" strokeWidth={3} />
            </motion.div>
          ) : (
            <motion.div
              key="circle"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <Circle className="w-6 h-6 text-white" fill="white" />
            </motion.div>
          )}
        </AnimatePresence>

        {isAnimating && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 rounded-full bg-purple-400/30"
          />
        )}
      </motion.button>

      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{ 
              opacity: 1, 
              scale: 1,
              x: 0,
              y: 0
            }}
            animate={{ 
              opacity: 0, 
              scale: 0,
              x: Math.cos(particle.angle * Math.PI / 180) * particle.distance,
              y: Math.sin(particle.angle * Math.PI / 180) * particle.distance
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              left: '50%',
              top: '50%',
              marginLeft: -particle.size / 2,
              marginTop: -particle.size / 2,
              boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

function MilestoneMediaGallery({
  media,
  onMediaClick,
  isDark
}: {
  media: MediaItem[];
  onMediaClick: (index: number) => void;
  isDark: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentMedia = media[currentIndex];

  const nextMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % media.length);
  };

  const prevMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  const renderMediaPreview = (item: MediaItem, onClick: () => void) => {
    if (item.type === "video") {
      return (
        <div className="relative w-full h-[130px] cursor-pointer" onClick={onClick}>
          <video
            src={item.url}
            className="w-full h-full object-cover"
            preload="metadata"
            muted
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="p-3 bg-white/90 rounded-full">
              <Play className="w-5 h-5 text-gray-800 fill-current" />
            </div>
          </div>
        </div>
      );
    }
    return (
      <img
        src={item.url}
        alt="Media"
        className="w-full h-[130px] object-cover cursor-pointer"
        onClick={onClick}
      />
    );
  };

  if (media.length === 1) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative group/gallery mt-4 max-w-[220px] rounded-xl overflow-hidden shadow-lg"
      >
        {renderMediaPreview(currentMedia, () => onMediaClick(0))}
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative group/gallery mt-4 max-w-[220px]"
    >
      <div className="relative rounded-xl overflow-hidden shadow-lg">
        {renderMediaPreview(currentMedia, () => onMediaClick(currentIndex))}
        
        {media.length > 1 && (
          <>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={prevMedia}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all opacity-0 group-hover/gallery:opacity-100"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={nextMedia}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all opacity-0 group-hover/gallery:opacity-100"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </motion.button>
          </>
        )}

        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/60 text-white text-xs rounded-full backdrop-blur-sm flex items-center gap-1">
          {currentMedia.type === "video" && <Play className="w-2.5 h-2.5 fill-current" />}
          {currentIndex + 1} / {media.length}
        </div>
      </div>

      {media.length > 1 && (
        <div className="flex justify-center gap-1 mt-2">
          {media.map((item, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
              className={`transition-all rounded-full ${
                index === currentIndex
                  ? item.type === "video" ? "bg-green-500 w-4 h-1.5" : "bg-purple-500 w-4 h-1.5"
                  : `${isDark ? 'bg-slate-600 hover:bg-slate-500' : 'bg-gray-300 hover:bg-gray-400'} w-1.5 h-1.5`
              }`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function MediaViewer({
  media,
  initialIndex,
  onClose,
  onDeleteMedia,
}: {
  media: MediaItem[];
  initialIndex: number;
  onClose: () => void;
  onDeleteMedia?: (mediaItem: MediaItem) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  // Clamp index when media array shrinks
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
  
  // Safety check - if currentMedia is undefined, don't render
  if (!currentMedia) {
    return null;
  }

  const nextMedia = () => {
    setCurrentIndex((prev) => (prev + 1) % media.length);
  };

  const prevMedia = () => {
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") nextMedia();
    if (e.key === "ArrowLeft") prevMedia();
    if (e.key === "Escape") onClose();
  };

  const handleDelete = () => {
    if (onDeleteMedia) {
      onDeleteMedia(currentMedia);
      if (media.length === 1) {
        onClose();
      } else if (currentIndex >= media.length - 1) {
        setCurrentIndex(0);
      }
    }
  };

  const renderThumbnail = (item: MediaItem, index: number) => {
    if (item.type === "video") {
      return (
        <div className="relative w-full h-full">
          <video
            src={item.url}
            className="w-full h-full object-cover"
            preload="metadata"
            muted
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Play className="w-4 h-4 text-white fill-current" />
          </div>
        </div>
      );
    }
    return (
      <img
        src={item.url}
        alt={`Thumbnail ${index + 1}`}
        className="w-full h-full object-cover"
      />
    );
  };

  return (
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

      {onDeleteMedia && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          className="absolute top-6 right-20 p-2.5 bg-red-500/80 hover:bg-red-500 text-white rounded-xl transition-colors z-10"
          title="Удалить"
        >
          <Trash2 className="w-5 h-5" />
        </motion.button>
      )}

      {media.length > 1 && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 text-white text-sm rounded-full z-10 backdrop-blur-sm flex items-center gap-2">
          {currentMedia.type === "video" && <Play className="w-3.5 h-3.5 fill-current" />}
          {currentIndex + 1} / {media.length}
        </div>
      )}

      {currentMedia.type === "video" ? (
        <motion.video
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          src={currentMedia.url}
          controls
          autoPlay
          className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <motion.img
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          src={currentMedia.url}
          alt={`Image ${currentIndex + 1}`}
          className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {media.length > 1 && (
        <>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              prevMedia();
            }}
            className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              nextMedia();
            }}
            className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </motion.button>
        </>
      )}

      {media.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto px-4 py-3 bg-white/10 rounded-2xl backdrop-blur-sm">
          {media.map((item, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.1 }}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
              className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden transition-all ${
                index === currentIndex
                  ? item.type === "video" ? "ring-2 ring-green-400 scale-105" : "ring-2 ring-purple-400 scale-105"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              {renderThumbnail(item, index)}
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export function RoadMapEditor({
  roadMap,
  onUpdateRoadMap,
  onAddMilestone,
  onUpdateMilestone,
  onDeleteMilestone,
  roadmapCategories: _roadmapCategories = [],
  onAddRoadmapCategory: _onAddRoadmapCategory,
  onAddCategory,
  isDark = false,
}: RoadMapEditorProps) {
  const [title, setTitle] = useState(roadMap.title);
  const [targetDate, setTargetDate] = useState(
    roadMap.targetDate
      ? new Date(roadMap.targetDate).toISOString().split("T")[0]
      : ""
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [viewerState, setViewerState] = useState<{milestoneId: string; mediaIndex: number} | null>(null);
  const [deletingMilestoneId, setDeletingMilestoneId] = useState<string | null>(null);
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const pdfInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const videoInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    setTitle(roadMap.title);
    setTargetDate(
      roadMap.targetDate
        ? new Date(roadMap.targetDate).toISOString().split("T")[0]
        : ""
    );
  }, [roadMap.id, roadMap.title, roadMap.targetDate]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    onUpdateRoadMap({
      ...roadMap,
      title: newTitle,
      updatedAt: new Date(),
    });
  };

  const handleTargetDateChange = (date: string) => {
    setTargetDate(date);
    onUpdateRoadMap({
      ...roadMap,
      targetDate: date ? new Date(date) : undefined,
      updatedAt: new Date(),
    });
  };

  const handleAddMilestone = () => {
    onAddMilestone(roadMap.id);
  };

  const handleUpdateMilestone = (milestoneId: string, updates: Partial<Milestone>) => {
    onUpdateMilestone(roadMap.id, milestoneId, updates);
  };

  const handleDeleteMilestone = (milestoneId: string) => {
    setDeletingMilestoneId(milestoneId);
    setTimeout(() => {
      onDeleteMilestone(roadMap.id, milestoneId);
      setDeletingMilestoneId(null);
    }, 300);
  };

  const handleToggleComplete = (milestoneId: string) => {
    const milestone = roadMap.milestones.find((m) => m.id === milestoneId);
    if (milestone) {
      handleUpdateMilestone(milestoneId, { completed: !milestone.completed });
    }
  };

  const handleImageUpload = async (milestoneId: string, files: FileList) => {
    const milestone = roadMap.milestones.find((m) => m.id === milestoneId);
    if (!milestone) return;

    try {
      const formData = new FormData();
      
      if (files.length === 1) {
        formData.append("image", files[0]);
        const response = await fetch("/api/upload/roadmap-image", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!response.ok) throw new Error("Upload failed");
        const data = await response.json();
        const currentImages = milestone.images || [];
        handleUpdateMilestone(milestoneId, { images: [...currentImages, data.url] });
      } else {
        for (let i = 0; i < files.length; i++) {
          formData.append("images", files[i]);
        }
        const response = await fetch("/api/upload/roadmap-images", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!response.ok) throw new Error("Upload failed");
        const data = await response.json();
        const currentImages = milestone.images || [];
        const newUrls = data.images.map((img: { url: string }) => img.url);
        handleUpdateMilestone(milestoneId, { images: [...currentImages, ...newUrls] });
      }
    } catch (error) {
      console.error("Image upload error:", error);
    }
  };

  const handleDeleteImage = async (milestoneId: string, imageUrl: string) => {
    const milestone = roadMap.milestones.find((m) => m.id === milestoneId);
    if (!milestone) return;

    try {
      const response = await fetch("/api/upload/roadmap-image", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
        credentials: "include",
      });
      if (!response.ok) {
        console.error("Failed to delete image from server");
      }
    } catch (error) {
      console.error("Error deleting image:", error);
    }

    const currentImages = typeof milestone.images === 'string' ? JSON.parse(milestone.images || '[]') : (milestone.images || []);
    const remainingImages = currentImages.filter((img: string) => img !== imageUrl);
    handleUpdateMilestone(milestoneId, { images: remainingImages.length > 0 ? remainingImages : undefined });
  };

  const handlePdfUpload = async (milestoneId: string, files: FileList) => {
    const milestone = roadMap.milestones.find((m) => m.id === milestoneId);
    if (!milestone) return;

    try {
      const formData = new FormData();
      
      if (files.length === 1) {
        formData.append("pdf", files[0]);
        const response = await fetch("/api/upload/roadmap-pdf", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!response.ok) throw new Error("Upload failed");
        const data = await response.json();
        const currentPdfs = milestone.pdfFiles || [];
        const pdfInfo = { url: data.url, name: data.originalName, size: data.size };
        handleUpdateMilestone(milestoneId, { pdfFiles: [...currentPdfs, JSON.stringify(pdfInfo)] as any });
      } else {
        for (let i = 0; i < files.length; i++) {
          formData.append("pdfs", files[i]);
        }
        const response = await fetch("/api/upload/roadmap-pdfs", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!response.ok) throw new Error("Upload failed");
        const data = await response.json();
        const currentPdfs = milestone.pdfFiles || [];
        const newPdfs = data.pdfs.map((pdf: { url: string; originalName: string; size: number }) => 
          JSON.stringify({ url: pdf.url, name: pdf.originalName, size: pdf.size })
        );
        handleUpdateMilestone(milestoneId, { pdfFiles: [...currentPdfs, ...newPdfs] as any });
      }
    } catch (error) {
      console.error("PDF upload error:", error);
    }
  };

  const handleDeletePdf = async (milestoneId: string, pdfUrl: string) => {
    const milestone = roadMap.milestones.find((m) => m.id === milestoneId);
    if (!milestone) return;

    try {
      const response = await fetch("/api/upload/roadmap-pdf", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl }),
        credentials: "include",
      });
      if (!response.ok) {
        console.error("Failed to delete PDF from server");
      }
    } catch (error) {
      console.error("Error deleting PDF:", error);
    }

    const currentPdfs = typeof milestone.pdfFiles === 'string' ? JSON.parse(milestone.pdfFiles || '[]') : (milestone.pdfFiles || []);
    const remainingPdfs = currentPdfs.filter((pdf: string) => {
      const parsed = typeof pdf === 'string' ? JSON.parse(pdf) : pdf;
      return parsed.url !== pdfUrl;
    });
    handleUpdateMilestone(milestoneId, { pdfFiles: remainingPdfs.length > 0 ? remainingPdfs : undefined } as any);
  };

  const handleVideoUpload = async (milestoneId: string, files: FileList) => {
    const milestone = roadMap.milestones.find((m) => m.id === milestoneId);
    if (!milestone) return;

    try {
      const formData = new FormData();
      
      if (files.length === 1) {
        formData.append("video", files[0]);
        const response = await fetch("/api/upload/roadmap-video", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!response.ok) throw new Error("Upload failed");
        const data = await response.json();
        const currentVideos = milestone.videos || [];
        const videoInfo = { url: data.url, name: data.originalName, size: data.size };
        handleUpdateMilestone(milestoneId, { videos: [...currentVideos, JSON.stringify(videoInfo)] as any });
      } else {
        for (let i = 0; i < files.length; i++) {
          formData.append("videos", files[i]);
        }
        const response = await fetch("/api/upload/roadmap-videos", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!response.ok) throw new Error("Upload failed");
        const data = await response.json();
        const currentVideos = milestone.videos || [];
        const newVideos = data.videos.map((video: { url: string; originalName: string; size: number }) => 
          JSON.stringify({ url: video.url, name: video.originalName, size: video.size })
        );
        handleUpdateMilestone(milestoneId, { videos: [...currentVideos, ...newVideos] as any });
      }
    } catch (error) {
      console.error("Video upload error:", error);
    }
  };

  const handleDeleteVideo = async (milestoneId: string, videoUrl: string) => {
    const milestone = roadMap.milestones.find((m) => m.id === milestoneId);
    if (!milestone) return;

    try {
      const response = await fetch("/api/upload/roadmap-video", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl }),
        credentials: "include",
      });
      if (!response.ok) {
        console.error("Failed to delete video from server");
      }
    } catch (error) {
      console.error("Error deleting video:", error);
    }

    const currentVideos = typeof milestone.videos === 'string' ? JSON.parse(milestone.videos || '[]') : (milestone.videos || []);
    const remainingVideos = currentVideos.filter((video: string) => {
      const parsed = typeof video === 'string' ? JSON.parse(video) : video;
      return parsed.url !== videoUrl;
    });
    handleUpdateMilestone(milestoneId, { videos: remainingVideos.length > 0 ? remainingVideos : undefined } as any);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const sortedMilestones = [...roadMap.milestones].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );

  const completedCount = sortedMilestones.filter(m => m.completed).length;
  const totalCount = sortedMilestones.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const viewerMilestone = viewerState ? roadMap.milestones.find(m => m.id === viewerState.milestoneId) : null;

  return (
    <div className={`flex-1 flex flex-col border-t border-l overflow-hidden ${isDark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border-slate-700/50' : 'bg-gradient-to-br from-gray-50 via-white to-indigo-50/30 border-gray-200'}`} style={{overflow: 'visible'}}>
      <div className={`relative border-b flex-shrink-0 z-30 overflow-hidden ${isDark ? 'border-slate-700/50' : 'border-gray-200/70'}`}>
        <div className="absolute inset-0 overflow-hidden">
          <div className={`absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl ${isDark ? 'bg-purple-600/10' : 'bg-purple-400/20'}`} />
          <div className={`absolute -bottom-24 -left-24 w-64 h-64 rounded-full blur-3xl ${isDark ? 'bg-indigo-600/10' : 'bg-indigo-400/20'}`} />
        </div>

        <div className={`relative px-6 py-4 ${isDark ? 'bg-slate-900/80' : 'bg-white/80'} backdrop-blur-xl`}>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <div className={`p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/30`}>
                <Route className="w-6 h-6 text-white" />
              </div>
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={`absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 ${isDark ? 'border-slate-900' : 'border-white'}`}
              />
            </div>

            <div className="flex-1">
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className={`w-full bg-transparent border-none outline-none text-xl font-bold ${isDark ? 'text-white placeholder:text-slate-500' : 'text-gray-900 placeholder:text-gray-400'}`}
                placeholder="Название дорожной карты..."
              />
            </div>

            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'} shadow-sm`}>
                <DatePickerInput
                  value={targetDate}
                  onChange={handleTargetDateChange}
                  isDark={isDark}
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddMilestone}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 text-white font-semibold flex items-center gap-2 text-sm shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40 transition-shadow"
              >
                <Plus className="w-4 h-4" />
                Добавить этап
              </motion.button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Прогресс выполнения
                </span>
                <span className={`text-xs font-bold ${progress === 100 ? 'text-emerald-500' : isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                  {completedCount}/{totalCount} этапов ({progress}%)
                </span>
              </div>
              <div className={`h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    progress === 100 
                      ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' 
                      : 'bg-gradient-to-r from-purple-400 via-indigo-500 to-purple-600'
                  }`}
                  style={{
                    boxShadow: progress === 100 
                      ? '0 0 16px rgba(52, 211, 153, 0.6)' 
                      : '0 0 16px rgba(139, 92, 246, 0.5)'
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-50 text-purple-600'
              }`}>
                <Flag className="w-3.5 h-3.5" />
                <span>{totalCount} этап{totalCount === 1 ? "" : totalCount > 1 && totalCount < 5 ? "а" : "ов"}</span>
              </div>
              {targetDate && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                  isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-50 text-amber-600'
                }`}>
                  <Target className="w-3.5 h-3.5" />
                  <span>Цель</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto relative z-0 ${isDark ? 'bg-slate-900/50' : 'bg-white/50'}`}>
        {sortedMilestones.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className={`p-6 rounded-3xl inline-block mb-6 ${isDark ? 'bg-slate-800/50' : 'bg-gray-100/50'}`}>
                <Route className={`w-20 h-20 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
              </div>
              <p className={`text-lg font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                Пока нет этапов
              </p>
              <p className={`text-sm mb-6 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Начните планировать, добавив первый этап
              </p>
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddMilestone}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 text-white font-semibold shadow-lg shadow-purple-500/30 flex items-center gap-2 mx-auto"
              >
                <Sparkles className="w-5 h-5" />
                Добавить первый этап
              </motion.button>
            </motion.div>
          </div>
        ) : (
          <div className="w-full h-full overflow-y-auto">
            <div className="relative p-6 pl-10">
              <div className={`absolute left-[54px] top-10 bottom-8 w-1 rounded-full ${
                isDark 
                  ? 'bg-gradient-to-b from-purple-500/50 via-indigo-500/50 to-pink-500/50' 
                  : 'bg-gradient-to-b from-purple-300 via-indigo-300 to-pink-300'
              }`}>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="w-full rounded-full bg-gradient-to-b from-purple-500 via-indigo-500 to-emerald-400"
                  style={{ boxShadow: '0 0 12px rgba(139, 92, 246, 0.5)' }}
                />
              </div>

              <AnimatePresence mode="popLayout">
                <div className="space-y-6 pl-16">
                  {sortedMilestones.map((milestone, index) => {
                    const isDeleting = deletingMilestoneId === milestone.id;
                    return (
                      <motion.div 
                        key={milestone.id}
                        layout
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ 
                          opacity: isDeleting ? 0 : 1, 
                          x: isDeleting ? 100 : 0,
                          scale: isDeleting ? 0.8 : 1
                        }}
                        exit={{ opacity: 0, x: 100, scale: 0.8 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 400, 
                          damping: 30,
                          delay: index * 0.05
                        }}
                        className="relative group"
                      >
                        <div className="absolute -left-[57px] top-5">
                          <AnimatedMilestoneCheckbox
                            completed={milestone.completed}
                            onClick={() => handleToggleComplete(milestone.id)}
                            isDark={isDark}
                          />
                        </div>

                        <motion.div 
                          whileHover={{ y: -2 }}
                          className={`rounded-2xl p-6 transition-all ${
                            isDark 
                              ? 'bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/60 hover:border-purple-500/40 shadow-lg shadow-black/20' 
                              : 'bg-white/90 backdrop-blur-xl border border-gray-200/80 hover:border-purple-300/60 shadow-lg shadow-gray-200/50'
                          } ${milestone.completed ? (isDark ? 'ring-1 ring-emerald-500/30' : 'ring-1 ring-emerald-400/30') : ''}`}
                        >
                          {milestone.completed && (
                            <div className="absolute top-3 right-3">
                              <div className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                                isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                              }`}>
                                Выполнено
                              </div>
                            </div>
                          )}

                          <div className="flex items-start gap-4 mb-4">
                            <div className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
                              isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-50 text-purple-600'
                            }`}>
                              <input
                                type="text"
                                value={milestone.year}
                                onChange={(e) =>
                                  handleUpdateMilestone(milestone.id, {
                                    year: e.target.value,
                                  })
                                }
                                placeholder="Год"
                                className="w-16 bg-transparent border-none outline-none text-center"
                              />
                            </div>
                            <input
                              type="text"
                              value={milestone.title}
                              onChange={(e) =>
                                handleUpdateMilestone(milestone.id, {
                                  title: e.target.value,
                                })
                              }
                              placeholder="Название этапа..."
                              className={`flex-1 bg-transparent border-none outline-none text-lg font-semibold ${
                                isDark ? 'text-white placeholder:text-slate-500' : 'text-gray-900 placeholder:text-gray-400'
                              }`}
                            />
                            <div className="flex items-center gap-1">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => fileInputRefs.current[milestone.id]?.click()}
                                className={`p-2 rounded-lg transition-all ${
                                  isDark ? 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300' : 'bg-purple-50 hover:bg-purple-100 text-purple-500 hover:text-purple-600'
                                }`}
                                title="Добавить фото"
                                data-testid={`button-add-image-${milestone.id}`}
                              >
                                <ImageIcon className="w-4 h-4" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => pdfInputRefs.current[milestone.id]?.click()}
                                className={`p-2 rounded-lg transition-all ${
                                  isDark ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300' : 'bg-blue-50 hover:bg-blue-100 text-blue-500 hover:text-blue-600'
                                }`}
                                title="Добавить PDF"
                                data-testid={`button-add-pdf-${milestone.id}`}
                              >
                                <FileText className="w-4 h-4" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => videoInputRefs.current[milestone.id]?.click()}
                                className={`p-2 rounded-lg transition-all ${
                                  isDark ? 'bg-green-500/10 hover:bg-green-500/20 text-green-400 hover:text-green-300' : 'bg-green-50 hover:bg-green-100 text-green-500 hover:text-green-600'
                                }`}
                                title="Добавить видео"
                                data-testid={`button-add-video-${milestone.id}`}
                              >
                                <Video className="w-4 h-4" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleDeleteMilestone(milestone.id)}
                                className={`p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
                                  isDark ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'
                                }`}
                                title="Удалить"
                                data-testid={`button-delete-milestone-${milestone.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                              <input
                                ref={(el) => { fileInputRefs.current[milestone.id] = el; }}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files.length > 0) {
                                    handleImageUpload(milestone.id, e.target.files);
                                    e.target.value = "";
                                  }
                                }}
                              />
                              <input
                                ref={(el) => { pdfInputRefs.current[milestone.id] = el; }}
                                type="file"
                                accept=".pdf,application/pdf"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files.length > 0) {
                                    handlePdfUpload(milestone.id, e.target.files);
                                    e.target.value = "";
                                  }
                                }}
                              />
                              <input
                                ref={(el) => { videoInputRefs.current[milestone.id] = el; }}
                                type="file"
                                accept="video/*"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files.length > 0) {
                                    handleVideoUpload(milestone.id, e.target.files);
                                    e.target.value = "";
                                  }
                                }}
                              />
                            </div>
                          </div>

                          <textarea
                            value={milestone.description}
                            onChange={(e) =>
                              handleUpdateMilestone(milestone.id, {
                                description: e.target.value,
                              })
                            }
                            placeholder="Описание этапа..."
                            className={`w-full bg-transparent border-none outline-none text-sm resize-none ${
                              isDark ? 'text-slate-300 placeholder:text-slate-500' : 'text-gray-600 placeholder:text-gray-400'
                            }`}
                            rows={3}
                          />

                          {(() => {
                            const images = milestone.images 
                              ? (typeof milestone.images === 'string' ? JSON.parse(milestone.images) : milestone.images)
                              : [];
                            const videos = milestone.videos 
                              ? (typeof milestone.videos === 'string' ? JSON.parse(milestone.videos) : milestone.videos)
                              : [];
                            const media = combineMedia(images, videos);
                            return media.length > 0 ? (
                              <MilestoneMediaGallery
                                media={media}
                                onMediaClick={(index) => setViewerState({ milestoneId: milestone.id, mediaIndex: index })}
                                isDark={isDark}
                              />
                            ) : null;
                          })()}

                          {milestone.pdfFiles && (() => {
                            const pdfFiles = typeof milestone.pdfFiles === 'string' ? JSON.parse(milestone.pdfFiles) : milestone.pdfFiles;
                            return pdfFiles && pdfFiles.length > 0 ? (
                              <div className="mt-4 space-y-2">
                                <div className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                  PDF документы
                                </div>
                                {pdfFiles.map((pdfStr: string, idx: number) => {
                                  const pdf = typeof pdfStr === 'string' ? JSON.parse(pdfStr) : pdfStr;
                                  return (
                                    <motion.div
                                      key={idx}
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      className={`flex items-center gap-3 p-3 rounded-xl ${
                                        isDark ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-gray-50 border border-gray-200'
                                      }`}
                                    >
                                      <div className={`p-2 rounded-lg ${isDark ? 'bg-red-500/20' : 'bg-red-50'}`}>
                                        <FileText className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                          {pdf.name}
                                        </div>
                                        <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                          {formatFileSize(pdf.size)}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <motion.button
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                          onClick={() => setPdfViewerUrl(pdf.url)}
                                          className={`p-2 rounded-lg transition-all ${
                                            isDark ? 'hover:bg-blue-500/20 text-slate-400 hover:text-blue-400' : 'hover:bg-blue-50 text-gray-400 hover:text-blue-500'
                                          }`}
                                          title="Просмотреть"
                                        >
                                          <Eye className="w-4 h-4" />
                                        </motion.button>
                                        <motion.a
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                          href={pdf.url}
                                          download={pdf.name}
                                          className={`p-2 rounded-lg transition-all ${
                                            isDark ? 'hover:bg-green-500/20 text-slate-400 hover:text-green-400' : 'hover:bg-green-50 text-gray-400 hover:text-green-500'
                                          }`}
                                          title="Скачать"
                                        >
                                          <Download className="w-4 h-4" />
                                        </motion.a>
                                        <motion.button
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                          onClick={() => handleDeletePdf(milestone.id, pdf.url)}
                                          className={`p-2 rounded-lg transition-all ${
                                            isDark ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'
                                          }`}
                                          title="Удалить"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </motion.button>
                                      </div>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            ) : null;
                          })()}


                          <div className={`flex items-center gap-3 mt-4 pt-4 border-t ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                              isDark ? 'bg-slate-800 text-slate-300' : 'bg-gray-50 text-gray-600'
                            }`}>
                              <Clock className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                              <DatePickerInput
                                value={new Date(milestone.date).toISOString().split("T")[0]}
                                onChange={(val) =>
                                  handleUpdateMilestone(milestone.id, {
                                    date: new Date(val),
                                  })
                                }
                                isDark={isDark}
                                className="text-xs"
                              />
                            </div>
                          </div>
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {viewerState && viewerMilestone && (() => {
          const images = viewerMilestone.images 
            ? (typeof viewerMilestone.images === 'string' ? JSON.parse(viewerMilestone.images) : viewerMilestone.images)
            : [];
          const videos = viewerMilestone.videos 
            ? (typeof viewerMilestone.videos === 'string' ? JSON.parse(viewerMilestone.videos) : viewerMilestone.videos)
            : [];
          const media = combineMedia(images, videos);
          
          const handleDeleteMedia = (mediaItem: MediaItem) => {
            if (mediaItem.type === "image") {
              handleDeleteImage(viewerState.milestoneId, mediaItem.url);
            } else {
              handleDeleteVideo(viewerState.milestoneId, mediaItem.url);
            }
          };
          
          return media.length > 0 ? (
            <MediaViewer
              media={media}
              initialIndex={viewerState.mediaIndex}
              onClose={() => setViewerState(null)}
              onDeleteMedia={handleDeleteMedia}
            />
          ) : null;
        })()}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`rounded-3xl shadow-2xl w-96 p-6 ${isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Создать категорию
                </h3>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewCategoryName("");
                  }}
                  className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Название категории..."
                className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-all mb-4 ${
                  isDark 
                    ? 'bg-slate-800 border-slate-700 text-white focus:border-purple-500' 
                    : 'bg-white border-gray-200 focus:border-purple-400'
                }`}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewCategoryName("");
                  }}
                  className={`px-4 py-2 rounded-xl font-medium transition-all ${
                    isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Отмена
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (newCategoryName.trim() && onAddCategory) {
                      const newCategory: Category = {
                        id: crypto.randomUUID(),
                        name: newCategoryName.trim(),
                        icon: "MapPin"
                      };
                      onAddCategory(newCategory);
                      setShowCreateModal(false);
                      setNewCategoryName("");
                    }
                  }}
                  disabled={!newCategoryName.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Создать
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pdfViewerUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setPdfViewerUrl(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-[90vw] h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setPdfViewerUrl(null)}
                className="absolute top-4 right-4 p-2.5 bg-black/70 hover:bg-black text-white rounded-xl transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </motion.button>
              <iframe
                src={pdfViewerUrl}
                className="w-full h-full border-0"
                title="PDF Viewer"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
