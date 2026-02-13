import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE = "/api";

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }

  return response.json();
}

export interface ApiNote {
  id: string;
  userId: string;
  categoryId: string | null;
  title: string;
  content: string;
  contentType: "markdown" | "html" | "rich_text";
  tags: string | null;
  isPinned: boolean;
  isFavorite: boolean;
  isPublic: boolean;
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string | null;
}

export interface ApiCategory {
  id: string;
  userId: string;
  name: string;
  color: string;
  icon: string | null;
  order: number;
  createdAt: string;
}

export interface ApiUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

export interface Block {
  id: string;
  type: "text" | "code" | "tasklist" | "image" | "bulletlist" | "orderedlist" | "table";
  content: string;
  metadata?: {
    language?: string;
    tasks?: { id: string; text: string; completed: boolean; dueDate?: Date; reminder?: boolean }[];
    taskListTitle?: string;
    width?: number;
    height?: number;
    items?: string[];
    images?: string[];
    alignment?: "left" | "center" | "right";
    tableData?: { rows: number; cols: number; cells: { [key: string]: string } };
  };
}

export function useCurrentUser() {
  return useQuery<{ user: ApiUser }, Error>({
    queryKey: ["currentUser"],
    queryFn: () => fetchApi("/auth/me"),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      fetchApi<{ user: ApiUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; password: string; username?: string }) =>
      fetchApi<{ user: ApiUser }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchApi<{ success: boolean }>("/auth/logout", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useNotes(filters?: { categoryId?: string; search?: string; isPinned?: boolean }) {
  const params = new URLSearchParams();
  if (filters?.categoryId) params.set("categoryId", filters.categoryId);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.isPinned !== undefined) params.set("isPinned", String(filters.isPinned));
  
  const queryString = params.toString();
  const url = `/notes${queryString ? `?${queryString}` : ""}`;

  return useQuery<ApiNote[], Error>({
    queryKey: ["notes", filters],
    queryFn: () => fetchApi(url),
    staleTime: 60 * 1000, // 1 minute stale time
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    refetchOnReconnect: false, // Prevent refetch on reconnect
  });
}

export function useNote(id: string | null) {
  return useQuery<ApiNote, Error>({
    queryKey: ["note", id],
    queryFn: () => fetchApi(`/notes/${id}`),
    enabled: !!id,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; content: string; categoryId?: string; contentType?: string }) =>
      fetchApi<ApiNote>("/notes", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; content?: string; categoryId?: string | null; isPinned?: boolean; isFavorite?: boolean }) =>
      fetchApi<ApiNote>(`/notes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["note", data.id] });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<{ success: boolean }>(`/notes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

export function useShareNote() {
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<{ shareToken: string; shareUrl: string }>(`/notes/${id}/share`, {
        method: "POST",
      }),
  });
}

export function useCategories() {
  return useQuery<ApiCategory[], Error>({
    queryKey: ["categories"],
    queryFn: () => fetchApi("/categories"),
    staleTime: 1 * 60 * 1000,
    refetchOnMount: true,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color?: string; icon?: string }) =>
      fetchApi<ApiCategory>("/categories", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; color?: string; icon?: string }) =>
      fetchApi<ApiCategory>(`/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<{ success: boolean }>(`/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function parseBlocks(content: string): Block[] {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [{ id: "b1", type: "text", content }];
  } catch {
    return [{ id: "b1", type: "text", content }];
  }
}

export function serializeBlocks(blocks: Block[]): string {
  return JSON.stringify(blocks);
}
