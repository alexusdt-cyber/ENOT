import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  useNotes as useApiNotes,
  useCategories,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  useCreateCategory,
  useCurrentUser,
} from "../lib/api";
import {
  apiNoteToLocalNote,
  localNoteToApiNote,
  apiCategoryToNotebook,
  createNewNoteForApi,
} from "../lib/noteUtils";
import type { Note, Notebook } from "../App";

export function useNotesData() {
  const { data: userData, isLoading: userLoading, error: userError } = useCurrentUser();
  const { data: apiNotes, isLoading: notesLoading, refetch: refetchNotes } = useApiNotes();
  const { data: apiCategories, isLoading: categoriesLoading } = useCategories();
  
  const createNoteMutation = useCreateNote();
  const updateNoteMutation = useUpdateNote();
  const deleteNoteMutation = useDeleteNote();
  const createCategoryMutation = useCreateCategory();

  // Track only the ID - derive selectedNote from notes array
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const isAuthenticated = !!userData?.user;
  const isLoading = userLoading || notesLoading || categoriesLoading;

  const categories = useMemo(() => apiCategories || [], [apiCategories]);

  const notebooks: Notebook[] = useMemo(() => {
    if (!categories.length) {
      return [
        { id: "default", name: "My Notes", color: "#6366f1" },
      ];
    }
    return categories.map(apiCategoryToNotebook);
  }, [categories]);

  const notes: Note[] = useMemo(() => {
    if (!apiNotes) return [];
    return apiNotes.map((apiNote) => apiNoteToLocalNote(apiNote, categories));
  }, [apiNotes, categories]);

  // Derive selectedNote from notes array using the ID
  const selectedNote = useMemo(() => {
    if (!selectedNoteId) return null;
    return notes.find(n => n.id === selectedNoteId) || null;
  }, [notes, selectedNoteId]);

  // Wrapper to accept Note object but store only ID
  const setSelectedNote = useCallback((note: Note | null) => {
    setSelectedNoteId(note?.id || null);
  }, []);

  // Track if initial selection has been done
  const hasInitializedRef = useRef(false);
  
  // Auto-select first note only once on initial load
  // Don't run on every notes change - only when we haven't initialized yet
  useEffect(() => {
    if (notes.length > 0 && !hasInitializedRef.current && selectedNoteId === null) {
      hasInitializedRef.current = true;
      const sortedNotes = [...notes].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
      setSelectedNoteId(sortedNotes[0].id);
    }
  }, [notes.length, selectedNoteId]);

  const handleCreateNote = useCallback(async () => {
    const noteData = createNewNoteForApi(
      "New Note",
      categories.length > 0 ? categories[0].id : undefined
    );
    
    try {
      const createdNote = await createNoteMutation.mutateAsync(noteData);
      const localNote = apiNoteToLocalNote(createdNote, categories);
      setSelectedNote(localNote);
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  }, [createNoteMutation, categories]);

  const handleUpdateNote = useCallback(
    async (updatedNote: Note) => {
      const apiData = localNoteToApiNote(updatedNote, categories);
      
      try {
        await updateNoteMutation.mutateAsync({
          id: updatedNote.id,
          ...apiData,
        });
        setSelectedNote(updatedNote);
      } catch (error) {
        console.error("Failed to update note:", error);
      }
    },
    [updateNoteMutation, categories]
  );

  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      try {
        await deleteNoteMutation.mutateAsync(noteId);
        if (selectedNote?.id === noteId) {
          setSelectedNote(null);
        }
      } catch (error) {
        console.error("Failed to delete note:", error);
      }
    },
    [deleteNoteMutation, selectedNote]
  );

  const handleTogglePin = useCallback(
    async (noteId: string) => {
      const note = notes.find((n) => n.id === noteId);
      if (!note) return;

      try {
        await updateNoteMutation.mutateAsync({
          id: noteId,
          isPinned: !note.pinned,
        });
      } catch (error) {
        console.error("Failed to toggle pin:", error);
      }
    },
    [notes, updateNoteMutation]
  );

  const handleCreateCategory = useCallback(
    async (name: string, color?: string) => {
      try {
        await createCategoryMutation.mutateAsync({ name, color });
      } catch (error) {
        console.error("Failed to create category:", error);
      }
    },
    [createCategoryMutation]
  );

  return {
    isAuthenticated,
    isLoading,
    userError,
    user: userData?.user,
    notes,
    notebooks,
    categories,
    selectedNote,
    setSelectedNote,
    handleCreateNote,
    handleUpdateNote,
    handleDeleteNote,
    handleTogglePin,
    handleCreateCategory,
    refetchNotes,
    isSaving: createNoteMutation.isPending || updateNoteMutation.isPending,
  };
}
