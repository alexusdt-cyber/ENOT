import { FileText, Plus } from "lucide-react";

interface EmptyStateProps {
  onCreateNote: () => void;
}

export function EmptyState({ onCreateNote }: EmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center bg-white border-l border-t border-gray-300">
      <div className="text-center max-w-md px-8">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
          <FileText className="w-12 h-12 text-indigo-400" />
        </div>
        
        <h2 className="text-2xl font-semibold text-gray-800 mb-3">
          No notes yet
        </h2>
        
        <p className="text-gray-500 mb-8">
          Create your first note to start capturing ideas, tasks, and everything important to you.
        </p>
        
        <button
          onClick={onCreateNote}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/30"
          data-testid="button-create-first-note"
        >
          <Plus className="w-5 h-5" />
          Create Your First Note
        </button>
      </div>
    </div>
  );
}
