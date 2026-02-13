import type { ApiNote, ApiCategory, Block } from "./api";
import type { Note, Notebook } from "../App";

export function apiNoteToLocalNote(apiNote: ApiNote, categories: ApiCategory[]): Note {
  let blocks: Block[] = [];
  try {
    const parsed = JSON.parse(apiNote.content);
    if (Array.isArray(parsed)) {
      blocks = parsed;
    } else {
      blocks = [{ id: "b1", type: "text", content: apiNote.content }];
    }
  } catch {
    blocks = [{ id: "b1", type: "text", content: apiNote.content }];
  }

  const category = categories.find(c => c.id === apiNote.categoryId);
  
  return {
    id: apiNote.id,
    title: apiNote.title,
    blocks,
    notebook: category?.name || "Uncategorized",
    createdAt: new Date(apiNote.createdAt),
    updatedAt: new Date(apiNote.updatedAt),
    tags: apiNote.tags ? apiNote.tags.split(",").filter(Boolean) : [],
    pinned: apiNote.isPinned,
  };
}

export function localNoteToApiNote(note: Note, categories: ApiCategory[]): {
  title: string;
  content: string;
  categoryId?: string | null;
  isPinned?: boolean;
  tags?: string;
} {
  const category = categories.find(c => c.name === note.notebook);
  
  return {
    title: note.title,
    content: JSON.stringify(note.blocks),
    categoryId: category?.id || null,
    isPinned: note.pinned || false,
    tags: note.tags.join(","),
  };
}

export function apiCategoryToNotebook(category: ApiCategory): Notebook {
  return {
    id: category.id,
    name: category.name,
    color: category.color || "#6366f1",
    categoryId: category.id,
  };
}

export function createNewNoteForApi(title: string, categoryId?: string): {
  title: string;
  content: string;
  categoryId?: string;
  contentType: string;
} {
  const blocks: Block[] = [{ id: "b" + Date.now(), type: "text", content: "" }];
  return {
    title,
    content: JSON.stringify(blocks),
    categoryId: categoryId || undefined,
    contentType: "rich_text",
  };
}
