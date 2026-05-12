/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_FEEDBACK_URL?: string;
  readonly VITE_GOOGLE_SHEETS_SPREADSHEET_ID?: string;
  readonly VITE_GOOGLE_SHEETS_BROWSER_URL?: string;
}
