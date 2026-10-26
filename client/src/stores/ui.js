import { defineStore } from "pinia";
import { ref } from "vue";
import { useStorage } from "@vueuse/core";

export const useUIStore = defineStore("ui", () => {
  // Modes: 'chat' | 'nearby'
  // Modes: 'chat' | 'dashboard'
  const currentMode = ref("chat"); // 'chat' | 'dashboard' : 'chat'

  // Accents: 'neon-blue' | 'neon-violet' | 'neon-cyan'
  const accentColor = useStorage("ag-accent-color", "neon-blue");

  const toggleMode = () => {
    currentMode.value = currentMode.value === "chat" ? "dashboard" : "chat";
  };

  const setAccent = (color) => {
    accentColor.value = color;
  };

  return {
    currentMode,
    accentColor,
    toggleMode,
    setAccent,
  };
});
