import { defineStore } from "pinia";
import { computed } from "vue";
import { useStorage } from "@vueuse/core";
import { v4 as uuidv4 } from "uuid";
import { useAuthStore } from "./auth";

export const useUserStore = defineStore("user", () => {
  const localId = useStorage("ag-user-id", uuidv4());
  const localUsername = useStorage(
    "ag-username",
    `Guest-${localId.value.slice(0, 4)}`,
  );
  const localAvatar = useStorage("ag-avatar", null); // URL or null

  const userId = computed(() => {
    const authStore = useAuthStore();
    if (authStore.isAuthenticated && authStore.user) {
      return String(authStore.user._id || authStore.user.id);
    }
    return localId.value;
  });

  const username = computed(() => {
    const authStore = useAuthStore();
    if (authStore.isAuthenticated && authStore.user) {
      return authStore.user.username;
    }
    return localUsername.value;
  });

  const avatar = computed(() => {
    const authStore = useAuthStore();
    if (authStore.isAuthenticated && authStore.user) {
      return authStore.user.avatar || null;
    }
    return localAvatar.value;
  });

  const setUsername = (name) => {
    localUsername.value = name;
  };

  return {
    userId,
    username,
    avatar,
    setUsername,
  };
});
