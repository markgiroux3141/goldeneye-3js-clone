import { defineConfig } from 'vite';
import { editorSavePlugin } from './vite-plugin-editor-save';

export default defineConfig({
  plugins: [editorSavePlugin()],
});
