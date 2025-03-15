import React, { useState, useLayoutEffect, useEffect, useContext, useRef } from "react";
import Widget from "../widget";
import { SettingsContext } from "utils/contexts/settings";

export default function Animated({ options }) {
  const intervalSeconds = options.interval;
  const transitionType = options.transition || "fade"; // Default transition
  const [currentIndex, setCurrentIndex] = useState(0);
  const [maxWidth, setMaxWidth] = useState(null);
  const [maxHeight, setMaxHeight] = useState(null);
  const [initializing, setInitializing] = useState(true); // Track if we are initializing components
  const [transitioning, setTransitioning] = useState(false); // Track if transitioning
  const containerRef = useRef(null);
  const isClient = typeof window !== "undefined"; // Ensure SSR safety
  const { settings } = useContext(SettingsContext);
  const headerStyle = settings?.headerStyle || "underlined";
  
  const useIsomorphicLayoutEffect = isClient ? useLayoutEffect : useEffect;

  // Rotate widgets at set intervals
  useIsomorphicLayoutEffect(() => {
    let timeoutId;
    timeoutId = setInterval(() => {
      if (!transitioning || initializing) {
        setTransitioning(true);
        const nextIndex = (currentIndex + 1) % options.widgets.length;
        if (initializing && currentIndex == 0 && maxWidth !== null) {
          // Finished going through all components
          console.log("Finished going through")
          setInitializing(false);
        } else {
          setCurrentIndex(nextIndex);
        }
      }
    }, initializing ? 1 : intervalSeconds * 1000);

    console.log(initializing ? 1 : intervalSeconds * 1000);
    
    return () => clearInterval(timeoutId);
  }, [intervalSeconds, currentIndex, initializing, transitioning, transitionType]);

  const handleTransitionEnd = () => {
    setTransitioning(false); // End transition
  };

  const measureDimensions = () => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    if (width > maxWidth || !maxWidth) {
      setMaxWidth(width);
    }
    if (height > maxHeight || !maxHeight) {
      setMaxHeight(height);
    }
  };

  useIsomorphicLayoutEffect(() => {
    if (!containerRef.current) return;
    
    // Force initial measurement
    measureDimensions();

    const observer = new ResizeObserver(measureDimensions);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [options.widgets.length, maxHeight, maxWidth]);

  const baseStyle = {
    opacity: 1,
    transform: "none"
  };

  const transitionStyle = (i) => ({
    opacity: (transitioning && transitionType === "fade") ? 0 : (i === currentIndex ? 1 : 0),
    transition: `${transitionType === "slide" || transitionType === "scale"
      ? "opacity 0.5s ease-in-out, transform 0.5s ease-in-out"
      : "opacity 1s"}`,
    transform:
      transitionType === "slide"
        ? `translateX(${i === currentIndex
            ? "0"
            : i === ((currentIndex - 1) % options.widgets.length)
              ? "-100%"
              : "100%"})`
        : transitionType === "scale"
        ? `${i === currentIndex
            ? "scale(1)"
            : i === ((currentIndex - 1) % options.widgets.length) || i === ((currentIndex + 1) % options.widgets.length)
              ? "scale(0.5)"
              : "none"}`
        : "none",
  });

  return (
    <div
      className="animated-wrapper flex flex-col max-w:full sm:basis-auto self-center grow-0 flex-wrap"
      ref={containerRef}
      style={{
        position: "relative",
        overflow: "hidden",
        width: "auto",
        height: "auto",
        minWidth: maxWidth || "0",
        minHeight: maxHeight || "0"
      }}
    >
      {options.widgets.map((widget, i) => (
        <div
          key={i}
          className={`widget-container transition-${transitionType}`}
          style={{
            visibility: i === currentIndex ? "visible" : "hidden",
            position: i !== currentIndex ? "absolute" : "relative",
            ...baseStyle,
            ...(initializing ? {opacity : 0} : transitionStyle(i))
          }}
          onTransitionEnd={i === currentIndex && transitioning ? handleTransitionEnd : null}
        >
          <Widget
            widget={widget}
            style={{ header: headerStyle, isRightAligned: false, cardBlur: settings.cardBlur }}
          />
        </div>
      ))}
    </div>
  );
}