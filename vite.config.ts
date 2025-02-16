import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.tsx',
      name: 'use-context-state-selector',
      fileName: (format) => `use-context-state-selector.${format}.js`,
      formats: ['es'],
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      },
    },
    sourcemap: true,
    emptyOutDir: true,
    minify: true,
  },
  plugins: [react(), dts({
    outDir: './dist',
  })],
})