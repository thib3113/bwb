import { useState, useContext, useCallback } from 'react';
import ReactConfetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { useKonamiCode } from '../../hooks/useKonamiCode';
import { ThemeContext } from '../../context/Contexts';
import { THEME_MODES } from '../../utils/constants';

export const EasterEggListener = () => {
  const [showConfetti, setShowConfetti] = useState(false);
  const { width, height } = useWindowSize();
  const themeContext = useContext(ThemeContext);

  const handleSuccess = useCallback(() => {
    console.log('Konami Code success!');
    setShowConfetti(true);

    // Switch to Matrix mode if not already active
    if (themeContext?.mode !== THEME_MODES.MATRIX) {
      themeContext?.setThemeMode(THEME_MODES.MATRIX);
    }

    // Hide confetti after a few seconds
    setTimeout(() => {
      setShowConfetti(false);
    }, 5000); // 5 seconds of confetti
  }, [themeContext]);

  // Hook handles global listeners and event dispatching
  useKonamiCode(handleSuccess);

  if (!showConfetti) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999
      }}
    >
      <ReactConfetti width={width} height={height} recycle={false} numberOfPieces={500} />
    </div>
  );
};
