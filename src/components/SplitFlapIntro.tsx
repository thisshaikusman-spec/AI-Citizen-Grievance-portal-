import React, { useEffect, useState, useCallback } from 'react';
import { SplitFlap, Presets } from 'react-split-flap';
import './SplitFlapIntro.css';

interface SplitFlapIntroProps {
  /** Called when the intro animation finishes or is skipped */
  onComplete: () => void;
}

/**
 * Full‑screen animated intro that shows the project title using a mechanical split‑flap
 * animation (airport‑board style). The intro plays once per browser‑tab session.
 */
const SplitFlapIntro: React.FC<SplitFlapIntroProps> = ({ onComplete }) => {
  const title = 'CITIZEN GRIEVANCE PORTAL';
  const [displayed, setDisplayed] = useState('');
  const [fadeOut, setFadeOut] = useState(false);

  // Add characters one‑by‑one
  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      setDisplayed((prev) => prev + title.charAt(idx));
      idx += 1;
      if (idx >= title.length) {
        clearInterval(interval);
        // keep the full title visible briefly before fading out
        setTimeout(() => setFadeOut(true), 1500);
      }
    }, 120); // flip speed – adjust to feel natural
    return () => clearInterval(interval);
  }, []);

  // Once fade‑out animation ends, notify the parent
  const handleTransitionEnd = useCallback(() => {
    if (fadeOut) {
      onComplete();
    }
  }, [fadeOut, onComplete]);

  // Skip button instantly ends the intro
  const handleSkip = () => {
    setFadeOut(true);
  };

  return (
    <div
      className={`splitflap-intro ${fadeOut ? 'fade-out' : ''}`}
      onTransitionEnd={handleTransitionEnd}
    >
      <div className="splitflap-container" aria-label="Project title animation">
        <SplitFlap
          value={displayed}
          chars={Presets.ALPHANUM}
          theme="dark"
          size="large"
          // The component already animates when the value changes
        />
      </div>
      <button className="skip-button" onClick={handleSkip} aria-label="Skip intro">
        Skip Intro
      </button>
    </div>
  );
};

export default SplitFlapIntro;
