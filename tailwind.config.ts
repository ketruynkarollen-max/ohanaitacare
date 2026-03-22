import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#7c5cf6",
          foreground: "#ffffff"
        },
        accent: {
          DEFAULT: "#7c5cf6",
          light: "#ede9fe",
          dark: "#5b3fd0",
        },
        sidebar: "#ffffff",
        "bg-app": "#eef0fb",
        // Paleta gamificada: estados visuais claros e recompensadores
        game: {
          pending: "#f59e0b",    // missão pendente (laranja)
          progress: "#06b6d4",   // em andamento (ciano)
          success: "#10b981",    // concluído / recompensa (verde)
          complete: "#22c55e",   // finalizar (verde forte)
          danger: "#ef4444",     // cancelar / alerta
          pay: "#3b82f6",       // ação pagar (azul)
          badge: "#8b5cf6",      // destaque (violeta)
        }
      },
      boxShadow: {
        panel: "0 4px 6px -1px rgb(0 0 0 / 0.15), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        "panel-lg": "0 10px 15px -3px rgb(0 0 0 / 0.15), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        "glow-success": "0 0 20px rgba(34, 197, 94, 0.35)",
        "glow-progress": "0 0 20px rgba(6, 182, 212, 0.35)",
        "glow-pending": "0 0 20px rgba(245, 158, 11, 0.35)",
      }
    }
  },
  plugins: []
}

export default config

