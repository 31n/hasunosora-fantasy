import { useEffect } from 'react';
import '../../styles/checkinAnimation.css';

interface CheckinAnimationProps {
  onComplete: () => void;
}

export default function CheckinAnimation({ onComplete }: CheckinAnimationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="checkin-overlay">
      <div className="checkin-animation">
        <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
          <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
          <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
        </svg>
      </div>
    </div>
  );
}
