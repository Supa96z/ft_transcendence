/** @type {import('tailwindcss').Config} */
export default {
  /**
   * This 'content' section tells Tailwind where to look for your classes.
   * It has been updated to match your project's folder structure.
   */
  content: [
    "./index.html",      // Scans your main HTML file
    "./ts/*.ts"     // <-- UPDATED: Looks for all .ts files in your /ts folder
  ],

  theme: {
    extend: {},
  },
  
  plugins: [],
}
