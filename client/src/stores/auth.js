import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { getApiUrl } from "../utils/api";

export const useAuthStore = defineStore("auth", () => {
  const user = ref(JSON.parse(localStorage.getItem("user")) || null);
  const token = ref(localStorage.getItem("token") || null);
  const isAuthenticated = computed(() => !!token.value);
  const router = useRouter();
  const error = ref(null);
  const loading = ref(false);

  // API URL
  const API_URL = getApiUrl();

  const register = async (userData) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      // Login success
      token.value = data.token;
      user.value = data;

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data));

      // Register this device silently
      try {
        const { useDeviceStore } = await import("./devices");
        const deviceStore = useDeviceStore();
        await deviceStore.registerThisDevice();
      } catch {}

      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const login = async (credentials) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      // Login success
      token.value = data.token;
      user.value = data;

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data));

      // Register this device silently
      try {
        const { useDeviceStore } = await import("./devices");
        const deviceStore = useDeviceStore();
        await deviceStore.registerThisDevice();
      } catch {}

      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateProfile = async ({ username, avatar }) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.value}`,
        },
        body: JSON.stringify({ username, avatar }),
      });

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(
          `Server returned status ${response.status}: ${response.statusText}`,
        );
      }

      if (!response.ok) {
        throw new Error(data?.message || "Failed to update profile");
      }

      // Maintain token in user object state
      user.value = { ...user.value, ...data, token: token.value };
      localStorage.setItem("user", JSON.stringify(user.value));

      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const logout = () => {
    token.value = null;
    user.value = null;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/auth");
  };

  return {
    user,
    token,
    isAuthenticated,
    error,
    loading,
    register,
    login,
    updateProfile,
    logout,
  };
});
