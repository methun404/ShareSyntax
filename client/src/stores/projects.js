import { defineStore } from "pinia";
import { ref } from "vue";
import { useAuthStore } from "./auth";
import { getApiUrl } from "../utils/api";

export const useProjectStore = defineStore("projects", () => {
  const authStore = useAuthStore();

  const projects = ref([]);
  const loading = ref(false);
  const error = ref(null);

  const API_URL = getApiUrl();

  const fetchProjects = async () => {
    if (!authStore.token) {
      console.warn("No auth token, skipping project fetch");
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`${API_URL}/api/projects`, {
        headers: {
          Authorization: `Bearer ${authStore.token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error("Session expired or unauthorized. Logging out.");
          authStore.logout();
        }
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }

      const data = await response.json();
      projects.value = Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("Error fetching projects:", err);
      error.value = err.message;
      projects.value = [];
    } finally {
      loading.value = false;
    }
  };

  const saveProject = async (projectData) => {
    if (!authStore.token) {
      console.warn("No auth token, cannot save project");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/projects`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authStore.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        throw new Error(`Failed to save project: ${response.statusText}`);
      }

      const savedProject = await response.json();

      // Update local state
      const existingIndex = projects.value.findIndex(
        (p) => p.roomId === savedProject.roomId,
      );
      if (existingIndex !== -1) {
        projects.value[existingIndex] = savedProject;
      } else {
        projects.value.unshift(savedProject);
      }

      return savedProject;
    } catch (err) {
      console.error("Error saving project:", err);
      throw err;
    }
  };

  const renameProject = async (id, newName) => {
    try {
      const response = await fetch(`${API_URL}/api/projects/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${authStore.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newName }),
      });

      if (!response.ok) throw new Error("Failed to rename project");

      const updated = await response.json();
      const index = projects.value.findIndex((p) => p.id === id);
      if (index !== -1) projects.value[index].name = updated.name;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const deleteProject = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/projects/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authStore.token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete project");

      projects.value = projects.value.filter((p) => p.id !== id);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const fetchRoomHistory = async (roomId) => {
    if (!authStore.token) return { messages: [], fileTree: null };
    try {
      const response = await fetch(
        `${API_URL}/api/projects/${roomId}/history`,
        {
          headers: {
            Authorization: `Bearer ${authStore.token}`,
            "Content-Type": "application/json",
          },
        },
      );
      if (!response.ok) return { messages: [], fileTree: null };
      return await response.json();
    } catch (err) {
      console.error("Error fetching room history:", err);
      return { messages: [], fileTree: null };
    }
  };

  const rehostProject = async (roomId) => {
    if (!authStore.token) throw new Error("Not authenticated");
    try {
      const response = await fetch(`${API_URL}/api/projects/${roomId}/rehost`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authStore.token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to rehost project");
      }

      const data = await response.json();

      // Update local state by reflecting the new room ID
      const existingIndex = projects.value.findIndex(
        (p) => p.roomId === roomId,
      );
      if (existingIndex !== -1) {
        projects.value[existingIndex].roomId = data.newRoomId;
      }

      return data.newRoomId;
    } catch (err) {
      console.error("Error rehosting project:", err);
      throw err;
    }
  };

  return {
    projects,
    loading,
    error,
    fetchProjects,
    saveProject,
    renameProject,
    deleteProject,
    fetchRoomHistory,
    rehostProject,
  };
});
