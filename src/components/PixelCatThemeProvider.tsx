// PixelCatThemeProvider removed
// This file used to provide the legacy 'pixel cat' theme compatibility layer.
// We replaced the theme provider with PokemonThemeProvider and updated imports across
// the codebase. The Pixel Cat theme is no longer used, but the file remains to
// avoid breaking concurrent edits — it&apos;s safe to delete once cached builds are cleared.

export default function PixelCatThemeProvider({ children }: any) {
  return children;
}
