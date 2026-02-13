import { useState } from "react";
import { Block } from "../App";
import { ImageGallery } from "./ImageGallery";
import { ImageViewer } from "./ImageViewer";

interface BlockDisplayProps {
  block: Block;
  readOnly?: boolean;
}

export function BlockDisplay({ block, readOnly = true }: BlockDisplayProps) {
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImageIndex, setViewerImageIndex] = useState(0);

  const handleImageClick = (index: number) => {
    setViewerImageIndex(index);
    setShowImageViewer(true);
  };

  switch (block.type) {
    case "text":
      return (
        <div
          className="mb-4 text-gray-800 leading-7"
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      );

    case "code":
      return (
        <pre className="mb-4 bg-gray-100 rounded-lg p-4 overflow-x-auto">
          <code className="text-sm text-gray-800 font-mono">{block.content}</code>
        </pre>
      );

    case "image":
      if (block.metadata?.images && block.metadata.images.length > 0) {
        return (
          <div className="mb-4">
            {showImageViewer && (
              <ImageViewer
                images={block.metadata.images}
                initialIndex={viewerImageIndex}
                onClose={() => setShowImageViewer(false)}
              />
            )}
            <ImageGallery
              images={block.metadata.images}
              width={block.metadata?.width}
              alignment={block.metadata?.alignment}
              onImageClick={handleImageClick}
            />
          </div>
        );
      }
      if (block.content) {
        return (
          <div className="mb-4">
            {showImageViewer && (
              <ImageViewer
                images={[block.content]}
                initialIndex={0}
                onClose={() => setShowImageViewer(false)}
              />
            )}
            <div
              className={`${
                block.metadata?.alignment === "center"
                  ? "flex justify-center"
                  : block.metadata?.alignment === "right"
                  ? "flex justify-end"
                  : ""
              }`}
            >
              <img
                src={block.content}
                alt="Note image"
                onClick={() => handleImageClick(0)}
                style={{
                  width: `${block.metadata?.width || 400}px`,
                  height: `${block.metadata?.height || 300}px`,
                  objectFit: "cover",
                  cursor: "pointer",
                }}
                className="rounded-lg"
              />
            </div>
          </div>
        );
      }
      return null;

    case "tasklist":
      return (
        <div className="mb-4 bg-gray-50 rounded-lg p-4">
          {block.metadata?.taskListTitle && (
            <h4 className="font-semibold mb-3 text-gray-900">{block.metadata.taskListTitle}</h4>
          )}
          <div className="space-y-2">
            {block.metadata?.tasks?.map((task) => (
              <div key={task.id} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={task.completed}
                  readOnly
                  className="w-4 h-4 rounded cursor-default"
                />
                <span
                  className={`${
                    task.completed
                      ? "line-through text-gray-500"
                      : "text-gray-800"
                  }`}
                >
                  {task.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      );

    case "table":
      const tableData = block.metadata?.tableData;
      if (!tableData) return null;

      return (
        <div className="mb-4 overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <tbody>
              {Array.from({ length: tableData.rows }).map((_, row) => (
                <tr key={row}>
                  {Array.from({ length: tableData.cols }).map((_, col) => {
                    const cellKey = `${row}-${col}`;
                    const cellContent = tableData.cells?.[cellKey] || "";
                    const cellAlign = tableData.alignment?.[cellKey] || "left";

                    return (
                      <td
                        key={cellKey}
                        className="border border-gray-300 p-3 text-sm"
                        style={{ textAlign: cellAlign as any }}
                      >
                        <div dangerouslySetInnerHTML={{ __html: cellContent }} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "bulletlist":
      const bulletItems = block.metadata?.items || [];
      return (
        <ul className="mb-4 ml-6 list-disc space-y-2">
          {bulletItems.map((item, idx) => (
            <li key={idx} className="text-gray-800">
              {item}
            </li>
          ))}
        </ul>
      );

    case "orderedlist":
      const orderedItems = block.metadata?.items || [];
      return (
        <ol className="mb-4 ml-6 list-decimal space-y-2">
          {orderedItems.map((item, idx) => (
            <li key={idx} className="text-gray-800">
              {item}
            </li>
          ))}
        </ol>
      );

    default:
      return null;
  }
}
