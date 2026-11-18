import { useCallback, useContext, useEffect, useState } from 'react';
import ProjectTypographyContext from './ProjectTypographyContext';
import { findFontOption } from './fontOptions';
import { normalizeFontSize } from './fontSize';
import { TYPOGRAPHY_CHANGED } from '../settings/settingsApi';

export default function useQaTypography() {
  const project = useContext(ProjectTypographyContext);
  const [preview, setPreview] = useState(null);
  const base = `${project.fontFamily}:${project.fontSize}`;
  if (preview && preview.base !== base) setPreview(null);
  const active = preview?.base === base ? preview : null;
  const font = findFontOption(active?.fontFamily || project.fontFamily);
  const fontSize = active?.fontSize ?? project.fontSize;
  const resetQa = useCallback(() => setPreview(null), []);
  useEffect(() => {
    window.addEventListener(TYPOGRAPHY_CHANGED, resetQa);
    return () => window.removeEventListener(TYPOGRAPHY_CHANGED, resetQa);
  }, [resetQa]);

  return {
    font, fontSize, qaOverride: Boolean(active),
    selectFont: (name) => setPreview({ base, fontFamily: findFontOption(name).name, fontSize }),
    selectFontSize: (size) => setPreview({ base, fontFamily: font.name, fontSize: normalizeFontSize(size, project.fontSize) }),
    resetQa,
  };
}
