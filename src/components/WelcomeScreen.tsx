import React, { useEffect } from 'react';
import { useAnimation } from '../context/AnimationContext.tsx';
import './WelcomeScreen.css';

const TEXT = 'AI CITIZEN GRIEVENCE';

const SplitFlapLetter: React.FC<{ char: string; index: number }> = ({ char, index }) => {
  const animationDelay = `${index * 0.08}s`;
  return (
    <div className="split-flap-tile" style={{ animationDelay }}>
      <span className="split-flap-char">{char}</span>
    </div>
  );
};

export const WelcomeScreen: React.FC<{ onEnter: () => void }> = ({ onEnter }) => {
  const { prefersReducedMotion } = useAnimation();

  // Skip animation for reduced motion users
  useEffect(() => {
    if (prefersReducedMotion) onEnter();
  }, [prefersReducedMotion, onEnter]);

  return (
    <div className="welcome-screen" role="dialog" aria-live="polite">
      <div className="split-flap-container">
        {TEXT.split('').map((c, i) => (
          <SplitFlapLetter key={i} char={c} index={i} />
        ))}
      </div>
      <button className="enter-button" onClick={onEnter} aria-label="Enter Website">
        Enter Website
      </button>
    </div>
  );
};
