import type { RoadMap, Milestone } from "../App";

const API_BASE = "/api";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }
  return response.json();
}

function transformRoadmap(r: any): RoadMap {
  return {
    ...r,
    milestones: (r.milestones || []).map((m: any) => ({
      ...m,
      year: String(m.year),
      date: m.date ? new Date(m.date) : new Date(),
      images: m.images ? (typeof m.images === 'string' ? JSON.parse(m.images) : m.images) : undefined,
    })),
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
    targetDate: r.targetDate ? new Date(r.targetDate) : undefined,
  };
}

function transformMilestone(m: any): Milestone {
  return {
    ...m,
    year: String(m.year),
    date: m.date ? new Date(m.date) : new Date(),
    images: m.images ? (typeof m.images === 'string' ? JSON.parse(m.images) : m.images) : undefined,
  };
}

export const roadmapApi = {
  async getRoadmaps(): Promise<RoadMap[]> {
    const response = await fetch(`${API_BASE}/roadmaps`, {
      credentials: "include",
    });
    const data = await handleResponse<any[]>(response);
    return data.map(transformRoadmap);
  },

  async getRoadmap(id: string): Promise<RoadMap> {
    const response = await fetch(`${API_BASE}/roadmaps/${id}`, {
      credentials: "include",
    });
    const data = await handleResponse<any>(response);
    return transformRoadmap(data);
  },

  async createRoadmap(data: {
    title: string;
    notebook?: string;
    targetDate?: Date;
    pinned?: boolean;
  }): Promise<RoadMap> {
    const response = await fetch(`${API_BASE}/roadmaps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...data,
        targetDate: data.targetDate?.toISOString(),
      }),
    });
    const result = await handleResponse<any>(response);
    return transformRoadmap(result);
  },

  async updateRoadmap(
    id: string,
    updates: {
      title?: string;
      notebook?: string;
      targetDate?: Date | null;
      pinned?: boolean;
    }
  ): Promise<RoadMap> {
    const response = await fetch(`${API_BASE}/roadmaps/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...updates,
        targetDate: updates.targetDate?.toISOString() ?? null,
      }),
    });
    const result = await handleResponse<any>(response);
    return transformRoadmap(result);
  },

  async deleteRoadmap(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/roadmaps/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    await handleResponse<{ success: boolean }>(response);
  },

  async createMilestone(
    roadmapId: string,
    data: {
      year: number;
      title: string;
      description?: string;
      completed?: boolean;
      date?: Date;
    }
  ): Promise<Milestone> {
    const response = await fetch(`${API_BASE}/roadmaps/${roadmapId}/milestones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...data,
        date: data.date?.toISOString(),
      }),
    });
    const result = await handleResponse<any>(response);
    return transformMilestone(result);
  },

  async updateMilestone(
    id: string,
    updates: {
      year?: number;
      title?: string;
      description?: string;
      completed?: boolean;
      date?: Date;
      images?: string[];
    }
  ): Promise<Milestone> {
    const response = await fetch(`${API_BASE}/milestones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...updates,
        year: updates.year !== undefined ? Number(updates.year) : undefined,
        date: updates.date?.toISOString(),
        images: updates.images !== undefined ? JSON.stringify(updates.images) : undefined,
      }),
    });
    const result = await handleResponse<any>(response);
    return transformMilestone(result);
  },

  async deleteMilestone(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/milestones/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    await handleResponse<{ success: boolean }>(response);
  },

  async getRoadmapCategories(): Promise<any[]> {
    const response = await fetch(`${API_BASE}/roadmap-categories`, {
      credentials: "include",
    });
    return handleResponse<any[]>(response);
  },

  async createRoadmapCategory(data: {
    name: string;
    icon?: string;
    color?: string;
  }): Promise<any> {
    const response = await fetch(`${API_BASE}/roadmap-categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse<any>(response);
  },

  async updateRoadmapCategory(
    id: string,
    updates: {
      name?: string;
      icon?: string;
      color?: string;
    }
  ): Promise<any> {
    const response = await fetch(`${API_BASE}/roadmap-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updates),
    });
    return handleResponse<any>(response);
  },

  async deleteRoadmapCategory(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/roadmap-categories/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    await handleResponse<{ success: boolean }>(response);
  },
};
