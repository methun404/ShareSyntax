import { defineStore } from "pinia";
import { ref } from "vue";
import { getApiUrl } from "../utils/api";
import { useAuthStore } from "./auth";

// Detect device platform
const detectPlatform = () => {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/macintosh|mac os x/i.test(ua)) return "mac";
  if (/windows/i.test(ua)) return "windows";
  if (/linux/i.test(ua)) return "linux";
  return "web";
};

// Get or generate a persistent device ID for this browser
const getOrCreateDeviceId = () => {
  let id = localStorage.getItem("ss_device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("ss_device_id", id);
  }
  return id;
};

// Get or generate a device name (user can rename later)
const getDefaultDeviceName = () => {
  const saved = localStorage.getItem("ss_device_name");
  if (saved) return saved;
  const platform = detectPlatform();
  const nameMap = {
    android: "My Android",
    ios: "My iPhone",
    mac: "My Mac",
    windows: "My PC",
    linux: "My Linux",
    web: "My Browser",
  };
  return nameMap[platform] || "My Device";
};

export const useDeviceStore = defineStore("devices", () => {
  const API_URL = getApiUrl();
  const authStore = useAuthStore();

  const devices = ref([]);
  const loading = ref(false);
  const deviceId = ref(getOrCreateDeviceId());
  const deviceName = ref(getDefaultDeviceName());

  // Register this device with the backend whenever user is authenticated
  const registerThisDevice = async () => {
    if (!authStore.isAuthenticated) return;

    try {
      await fetch(`${API_URL}/api/devices/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authStore.token}`,
        },
        body: JSON.stringify({
          deviceId: deviceId.value,
          deviceName: deviceName.value,
          platform: detectPlatform(),
        }),
      });
    } catch (err) {
      console.warn("[Devices] Could not register device:", err.message);
    }
  };

  // Fetch all saved devices for this user
  const fetchDevices = async () => {
    if (!authStore.isAuthenticated) return;
    loading.value = true;
    try {
      const res = await fetch(`${API_URL}/api/devices`, {
        headers: { Authorization: `Bearer ${authStore.token}` },
      });
      if (res.status === 401) {
        console.error("[Devices] Session expired. Logging out.");
        authStore.logout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        devices.value = Array.isArray(data) ? data : [];
      } else {
        devices.value = [];
      }
    } catch (err) {
      console.warn("[Devices] Fetch error:", err.message);
      devices.value = [];
    } finally {
      loading.value = false;
    }
  };

  // Rename a device (and persist locally if it's the current device)
  const renameDevice = async (dId, newName) => {
    try {
      const res = await fetch(`${API_URL}/api/devices/${dId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authStore.token}`,
        },
        body: JSON.stringify({ deviceName: newName }),
      });
      if (res.ok) {
        // Update local list
        const d = devices.value.find((d) => d.device_id === dId);
        if (d) d.device_name = newName;

        // If renaming current device, persist name locally
        if (dId === deviceId.value) {
          deviceName.value = newName;
          localStorage.setItem("ss_device_name", newName);
        }
      }
    } catch (err) {
      console.warn("[Devices] Rename error:", err.message);
    }
  };

  // Remove a device from the saved list
  const removeDevice = async (dId) => {
    try {
      const res = await fetch(`${API_URL}/api/devices/${dId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authStore.token}` },
      });
      if (res.ok) {
        devices.value = devices.value.filter((d) => d.device_id !== dId);
        // If user removes current device, clear its local storage
        if (dId === deviceId.value) {
          localStorage.removeItem("ss_device_id");
          localStorage.removeItem("ss_device_name");
        }
      }
    } catch (err) {
      console.warn("[Devices] Remove error:", err.message);
    }
  };

  // Update which room this device was last in (for quick-reconnect)
  const updateLastGroup = async (groupId) => {
    if (!authStore.isAuthenticated) return;
    try {
      await fetch(`${API_URL}/api/devices/update-group`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authStore.token}`,
        },
        body: JSON.stringify({ deviceId: deviceId.value, groupId }),
      });
    } catch (err) {
      // Silently fail, not critical
    }
  };

  // Get share link for a specific device's last room
  const getShareLink = (device) => {
    if (!device.last_group_id) return null;
    return `${window.location.origin}/join/${device.last_group_id}`;
  };

  // Get platform icon name
  const getPlatformIcon = (platform) => {
    const icons = {
      android: "📱",
      ios: "📱",
      mac: "💻",
      windows: "🖥️",
      linux: "🐧",
      web: "🌐",
    };
    return icons[platform] || "🖥️";
  };

  // Format last seen
  const formatLastSeen = (timestamp) => {
    if (!timestamp) return "Never";
    const now = new Date();
    const seen = new Date(timestamp);
    const diff = Math.floor((now - seen) / 1000);

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return {
    devices,
    loading,
    deviceId,
    deviceName,
    registerThisDevice,
    fetchDevices,
    renameDevice,
    removeDevice,
    updateLastGroup,
    getShareLink,
    getPlatformIcon,
    formatLastSeen,
  };
});
