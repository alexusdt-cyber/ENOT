import { useState } from "react";
import { ChevronLeft, ChevronRight, X, Settings, AlignLeft, AlignCenter, AlignRight, Trash2 } from "lucide-react";

interface ImageGalleryProps {
  images: string[];
  width?: number;
  alignment?: "left" | "center" | "right";
  onImageClick: (index: number) => void;
  onUpdateSettings?: (width: number, alignment: "left" | "center" | "right") => void;
  onDelete?: () => void;
  onDeleteImage?: (imageUrl: string) => void;
}

export function ImageGallery({
  images,
  width = 400,
  alignment = "left",
  onImageClick,
  onUpdateSettings,
  onDelete,
  onDeleteImage,
}: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [localWidth, setLocalWidth] = useState(width);
  const [localAlignment, setLocalAlignment] = useState(alignment);

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSettings(!showSettings);
  };

  const handleWidthChange = (newWidth: number) => {
    setLocalWidth(newWidth);
    if (onUpdateSettings) {
      onUpdateSettings(newWidth, localAlignment);
    }
  };

  const handleAlignmentChange = (newAlignment: "left" | "center" | "right") => {
    setLocalAlignment(newAlignment);
    if (onUpdateSettings) {
      onUpdateSettings(localWidth, newAlignment);
    }
  };

  const getAlignmentClass = () => {
    switch (localAlignment) {
      case "center":
        return "mx-auto";
      case "right":
        return "ml-auto";
      default:
        return "";
    }
  };

  const handleDeleteCurrentImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const imageUrl = images[currentIndex];
    if (onDeleteImage) {
      onDeleteImage(imageUrl);
    }
  };

  // Single image display
  if (images.length === 1) {
    return (
      <div className={`relative group ${getAlignmentClass()}`} style={{ width: `${localWidth}px`, maxWidth: "100%" }}>
        <img
          src={images[0]}
          alt="Uploaded"
          className="w-full h-auto rounded-lg cursor-pointer"
          onClick={() => onImageClick(0)}
          onDoubleClick={handleDoubleClick}
        />
        
        {onDeleteImage && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteImage(images[0]);
            }}
            className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 rounded-lg shadow-lg transition-colors z-20"
            title="Удалить изображение"
            data-testid="button-delete-image"
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>
        )}

        {showSettings && (
          <div className="mt-3 p-4 bg-white rounded-lg shadow-lg border border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm text-gray-700">Image Settings</h4>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div>
              <label className="text-xs text-gray-600 mb-2 block">Width</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="200"
                  max="800"
                  value={localWidth}
                  onChange={(e) => handleWidthChange(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-xs text-gray-600 w-16">{localWidth}px</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-600 mb-2 block">Alignment</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAlignmentChange("left")}
                  className={`flex-1 p-2 rounded flex items-center justify-center gap-1 transition-colors ${
                    localAlignment === "left"
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <AlignLeft className="w-4 h-4" />
                  <span className="text-xs">Left</span>
                </button>
                <button
                  onClick={() => handleAlignmentChange("center")}
                  className={`flex-1 p-2 rounded flex items-center justify-center gap-1 transition-colors ${
                    localAlignment === "center"
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <AlignCenter className="w-4 h-4" />
                  <span className="text-xs">Center</span>
                </button>
                <button
                  onClick={() => handleAlignmentChange("right")}
                  className={`flex-1 p-2 rounded flex items-center justify-center gap-1 transition-colors ${
                    localAlignment === "right"
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <AlignRight className="w-4 h-4" />
                  <span className="text-xs">Right</span>
                </button>
              </div>
            </div>

            {onDelete && (
              <button
                onClick={onDelete}
                className="w-full p-2 text-sm text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
              >
                Delete Image
              </button>
            )}
          </div>
        )}

        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleDoubleClick}
            className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow-md hover:bg-white transition-colors"
            title="Настройки"
          >
            <Settings className="w-4 h-4 text-gray-700" />
          </button>
        </div>
      </div>
    );
  }

  // Gallery display
  return (
    <div className={`relative group ${getAlignmentClass()}`} style={{ width: `${localWidth}px`, maxWidth: "100%" }}>
      <div className="relative rounded-lg overflow-hidden">
        <img
          src={images[currentIndex]}
          alt={`Image ${currentIndex + 1}`}
          className="w-full h-auto cursor-pointer"
          onClick={() => onImageClick(currentIndex)}
          onDoubleClick={handleDoubleClick}
        />

        {/* Settings button */}
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <button
            onClick={handleDoubleClick}
            className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow-md hover:bg-white transition-colors"
            title="Настройки"
          >
            <Settings className="w-4 h-4 text-gray-700" />
          </button>
        </div>

        {/* Delete button */}
        {onDeleteImage && (
          <button
            onClick={handleDeleteCurrentImage}
            className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 rounded-lg shadow-lg transition-colors z-20"
            title="Удалить изображение"
            data-testid="button-delete-gallery-image"
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>
        )}

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all opacity-0 group-hover:opacity-100"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Image counter */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 text-white text-xs rounded-full">
          {currentIndex + 1} / {images.length}
        </div>
      </div>

      {/* Settings panel for gallery */}
      {showSettings && (
        <div className="mt-3 p-4 bg-white rounded-lg shadow-lg border border-gray-200 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm text-gray-700">Image Settings</h4>
            <button
              onClick={() => setShowSettings(false)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div>
            <label className="text-xs text-gray-600 mb-2 block">Width</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="200"
                max="800"
                value={localWidth}
                onChange={(e) => handleWidthChange(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs text-gray-600 w-16">{localWidth}px</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-600 mb-2 block">Alignment</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleAlignmentChange("left")}
                className={`flex-1 p-2 rounded flex items-center justify-center gap-1 transition-colors ${
                  localAlignment === "left"
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <AlignLeft className="w-4 h-4" />
                <span className="text-xs">Left</span>
              </button>
              <button
                onClick={() => handleAlignmentChange("center")}
                className={`flex-1 p-2 rounded flex items-center justify-center gap-1 transition-colors ${
                  localAlignment === "center"
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <AlignCenter className="w-4 h-4" />
                <span className="text-xs">Center</span>
              </button>
              <button
                onClick={() => handleAlignmentChange("right")}
                className={`flex-1 p-2 rounded flex items-center justify-center gap-1 transition-colors ${
                  localAlignment === "right"
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <AlignRight className="w-4 h-4" />
                <span className="text-xs">Right</span>
              </button>
            </div>
          </div>

          {onDelete && (
            <button
              onClick={onDelete}
              className="w-full p-2 text-sm text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
            >
              Delete Gallery
            </button>
          )}
        </div>
      )}

      {/* Thumbnail dots */}
      {images.length > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? "bg-indigo-600 w-6"
                  : "bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
