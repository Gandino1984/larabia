import { useEffect, useState, useRef, useCallback } from 'react';
import { useSpring, animated } from '@react-spring/web';
import './CardDisplay.css';
import ErrorCard from './ErrorCard.jsx';
import SuccessCard from './SuccessCard.jsx';
import InfoCard from './InfoCard.jsx';
import { useUI } from '../../app_context/UIContext.jsx';

const AUTO_DISMISS_DELAY = 5500;

function CardDisplay() {
  const [activeCards, setActiveCards] = useState([]);
  const cardIdCounter = useRef(0);

  const {
    error,
    success,
    info,
    showErrorCard,
    showSuccessCard,
    showInfoCard,
    setShowErrorCard,
    setShowSuccessCard,
    setShowInfoCard,
    clearError,
    clearSuccess,
    clearInfo,
    addToCardHistory
  } = useUI();

  const hasAnyValue = (obj) => {
    return obj && Object.values(obj).some(value => value);
  };

  const addCard = (type, content) => {
    const newCard = {
      id: cardIdCounter.current++,
      type,
      content,
      isVisible: false
    };

    setActiveCards(prev => [...prev, newCard]);

    addToCardHistory(type, content);

    setTimeout(() => {
      setActiveCards(prev =>
        prev.map(card =>
          card.id === newCard.id ? { ...card, isVisible: true } : card
        )
      );
    }, 10);
  };

  const removeCard = (cardId, type) => {
    setActiveCards(prev =>
      prev.map(card =>
        card.id === cardId ? { ...card, isVisible: false } : card
      )
    );

    setTimeout(() => {
      setActiveCards(prev => prev.filter(card => card.id !== cardId));

      switch(type) {
        case 'error':
          setShowErrorCard(false);
          clearError();
          break;
        case 'success':
          setShowSuccessCard(false);
          clearSuccess();
          break;
        case 'info':
          setShowInfoCard(false);
          clearInfo();
          break;
      }
    }, 300);
  };

  useEffect(() => {
    if (error && hasAnyValue(error) && !activeCards.some(c => c.type === 'error')) {
      setShowErrorCard(true);
      addCard('error', error);
    }
  }, [error]);

  useEffect(() => {
    if (success && hasAnyValue(success) && !activeCards.some(c => c.type === 'success')) {
      setShowSuccessCard(true);
      addCard('success', success);
    }
  }, [success]);

  useEffect(() => {
    console.log('CardDisplay info effect triggered:', { info, hasValue: hasAnyValue(info), activeCards: activeCards.length });
    if (info && hasAnyValue(info) && !activeCards.some(c => c.type === 'info')) {
      console.log('Creating info card');
      setShowInfoCard(true);
      addCard('info', info);
    }
  }, [info]);

  const backdropAnimation = useSpring({
    opacity: activeCards.length > 0 ? 1 : 0,
    config: {
      tension: 280,
      friction: 60,
      mass: 1
    }
  });

  return (
    <>
      {activeCards.length > 0 && (
        <animated.div
          className="card-display-backdrop"
          style={backdropAnimation}
        />
      )}
      <div className="card-display-container">
        {activeCards.map((card) => (
          <AnimatedCard
            key={card.id}
            card={card}
            onClose={() => removeCard(card.id, card.type)}
          />
        ))}
      </div>
    </>
  );
}

const AnimatedCard = ({ card, onClose }) => {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const dragStartX = useRef(0);
  const cardRef = useRef(null);
  const timerRef = useRef(null);
  const remainingTimeRef = useRef(AUTO_DISMISS_DELAY);
  const startTimeRef = useRef(null);
  const isPausedRef = useRef(false);

  const DISMISS_THRESHOLD = 100;

  // Keep isPausedRef in sync with isPaused state
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      // Only dismiss if not paused
      if (!isPausedRef.current) {
        setIsDismissing(true);
      }
    }, remainingTimeRef.current);
  }, []);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
    }
  }, []);

  const handleTogglePause = useCallback((e) => {
    e.stopPropagation();
    if (isPaused) {
      setIsDismissing(true);
    } else {
      pauseTimer();
      setIsPaused(true);
    }
  }, [isPaused, pauseTimer]);

  useEffect(() => {
    if (card.isVisible && !isPaused && !isDismissing) {
      startTimer();
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [card.isVisible, isPaused, isDismissing, startTimer]);

  const slideAnimation = useSpring({
    from: {
      opacity: 0,
      transform: 'translate(-50%, -150%)',
    },
    to: {
      opacity: card.isVisible && !isDismissing ? 1 : 0,
      transform: isDismissing
        ? 'translate(100%, 0%)'
        : card.isVisible
          ? 'translate(-50%, 0%)'
          : 'translate(-50%, -150%)',
    },
    config: {
      mass: 1,
      tension: 180,
      friction: 20
    },
    onRest: () => {
      if (isDismissing) {
        onClose();
      }
    }
  });

  const dragAnimation = useSpring({
    x: isDragging ? dragX : 0,
    opacity: isDragging ? Math.max(0.3, 1 - Math.abs(dragX) / 200) : 1,
    config: {
      tension: 300,
      friction: 25
    }
  });

  const handlePointerDown = (e) => {
    if (isDismissing) return;
    setIsDragging(true);
    dragStartX.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging || isDismissing) return;
    const deltaX = e.clientX - dragStartX.current;
    setDragX(Math.max(0, deltaX));
  };

  const handlePointerUp = (e) => {
    if (!isDragging || isDismissing) return;
    setIsDragging(false);

    if (dragX >= DISMISS_THRESHOLD) {
      setIsDismissing(true);
    } else {
      setDragX(0);
    }
  };

  const getCardComponent = () => {
    const pauseProps = {
      isPaused,
      onTogglePause: handleTogglePause
    };

    switch(card.type) {
      case 'error':
        return <ErrorCard {...pauseProps} />;
      case 'success':
        return <SuccessCard {...pauseProps} />;
      case 'info':
        return <InfoCard {...pauseProps} />;
      default:
        return null;
    }
  };

  return (
    <animated.div
      className="card-wrapper"
      style={slideAnimation}
    >
      <animated.div
        ref={cardRef}
        className={`card-content ${isDragging ? 'dragging' : ''}`}
        style={{
          x: dragAnimation.x,
          opacity: dragAnimation.opacity,
          touchAction: 'pan-y',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {getCardComponent()}
      </animated.div>
    </animated.div>
  );
};

export default CardDisplay;
