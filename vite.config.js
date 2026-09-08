import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the built app from https://<user>.github.io/<repo>/,
  // so assets need to be requested from that subpath rather than "/".
  // Change this if your GitHub repo is named something other than
  // "summer-showdown".
  base: process.env.GITHUB_ACTIONS ? '/summer_showdown/' : '/',
})