import { useState } from "react";
import { Copy, Trash2, Check } from "lucide-react";
import { copyToClipboard } from "../utils/clipboard";

interface CodeBlockProps {
  language: string;
  code: string;
  onUpdate: (language: string, code: string) => void;
  onDelete: () => void;
}

export function CodeBlock({ language, code, onUpdate, onDelete }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const languages = [
    "javascript",
    "typescript",
    "python",
    "java",
    "html",
    "css",
    "json",
    "sql",
    "bash",
    "php",
  ];

  const handleCopy = () => {
    copyToClipboard(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-white/40 bg-slate-900/90 backdrop-blur-sm shadow-lg">
      {/* Code Block Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/90 border-b border-slate-700/50">
        <select
          value={language}
          onChange={(e) => onUpdate(e.target.value, code)}
          className="px-3 py-1 text-sm rounded bg-slate-700/50 text-gray-300 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        >
          {languages.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-slate-700/50 rounded transition-colors"
            title="Copy code"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4 text-gray-400" />
            )}
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
            title="Delete code block"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>

      {/* Code Editor */}
      <textarea
        value={code}
        onChange={(e) => onUpdate(language, e.target.value)}
        placeholder={`Enter your ${language} code here...`}
        className="w-full min-h-[200px] p-4 bg-transparent text-gray-100 font-mono text-sm resize-none focus:outline-none"
        spellCheck={false}
      />
    </div>
  );
}
