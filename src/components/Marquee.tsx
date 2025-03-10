import React, {
  Fragment,
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  ReactNode,
  CSSProperties,
  FC,
  forwardRef,
  Children,
  MutableRefObject,
  RefAttributes,
} from "react";
import "./Marquee.scss";

export type MarqueeProps = {
  /**
   * @description Inline style for the container div
   * @type {CSSProperties}
   * @default {}
   */
  style?: CSSProperties;
  /**
   * @description Class name to style the container div
   * @type {string}
   * @default ""
   */
  className?: string;
  /**
   * @description Whether to automatically fill blank space in the marquee with copies of the children or not
   * @type {boolean}
   * @default false
   */
  autoFill?: boolean;
  /**
   * @description Whether to play or pause the marquee
   * @type {boolean}
   * @default true
   */
  play?: boolean;
  /**
   * @description Whether to pause the marquee when hovered
   * @type {boolean}
   * @default false
   */
  pauseOnHover?: boolean;
  /**
   * @description Whether to pause the marquee when clicked
   * @type {boolean}
   * @default false
   */
  pauseOnClick?: boolean;
  /**
   * @description Whether the marquee should be draggable with mouse/touch
   * @type {boolean}
   * @default false
   */
  draggable?: boolean;
  /**
   * @description The direction the marquee is sliding
   * @type {"left" | "right" | "up" | "down"}
   * @default "left"
   */
  direction?: "left" | "right" | "up" | "down";
  /**
   * @description Speed calculated as pixels/second
   * @type {number}
   * @default 50
   */
  speed?: number;
  /**
   * @description Duration to delay the animation after render, in seconds
   * @type {number}
   * @default 0
   */
  delay?: number;
  /**
   * @description The number of times the marquee should loop, 0 is equivalent to infinite
   * @type {number}
   * @default 0
   */
  loop?: number;
  /**
   * @description Whether to show the gradient or not
   * @type {boolean}
   * @default false
   */
  gradient?: boolean;
  /**
   * @description The color of the gradient
   * @type {string}
   * @default "white"
   */
  gradientColor?: string;
  /**
   * @description The width of the gradient on either side
   * @type {number | string}
   * @default 200
   */
  gradientWidth?: number | string;
  /**
   * @description A callback for when the marquee finishes scrolling and stops. Only calls if loop is non-zero.
   * @type {() => void}
   * @default null
   */
  onFinish?: () => void;
  /**
   * @description A callback for when the marquee finishes a loop. Does not call if maximum loops are reached (use onFinish instead).
   * @type {() => void}
   * @default null
   */
  onCycleComplete?: () => void;
  /**
   * @description: A callback function that is invoked once the marquee has finished mounting. It can be utilized to recalculate the page size, if necessary.
   * @type {() => void}
   * @default null
   */
  onMount?: () => void;
  /**
   * @description The children rendered inside the marquee
   * @type {ReactNode}
   * @default null
   */
  children?: ReactNode;
} & RefAttributes<HTMLDivElement>;

const Marquee: FC<MarqueeProps> = forwardRef(function Marquee(
  {
    style = {},
    className = "",
    autoFill = false,
    play = true,
    pauseOnHover = false,
    pauseOnClick = false,
    draggable = false,
    direction = "left",
    speed = 50,
    delay = 0,
    loop = 0,
    gradient = false,
    gradientColor = "white",
    gradientWidth = 200,
    onFinish,
    onCycleComplete,
    onMount,
    children,
  },
  ref
) {
  // React Hooks
  const [containerWidth, setContainerWidth] = useState(0);
  const [marqueeWidth, setMarqueeWidth] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [isMounted, setIsMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = (ref as MutableRefObject<HTMLDivElement>) || rootRef;
  const marqueeRef = useRef<HTMLDivElement>(null);

  // State for dragging
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState(0);
  // Refs to access the marquee elements
  const firstMarqueeRef = useRef<HTMLDivElement>(null);
  const secondMarqueeRef = useRef<HTMLDivElement>(null);

  // Add state to track the current animation position
  const [animationPosition, setAnimationPosition] = useState(0);

  // Refs for animation frame and current position
  const animationFrameRef = useRef<number | null>(null);
  const currentDragOffsetRef = useRef(0);

  // Calculate width of container and marquee and set multiplier
  const calculateWidth = useCallback(() => {
    if (marqueeRef.current && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const marqueeRect = marqueeRef.current.getBoundingClientRect();
      let containerWidth = containerRect.width;
      let marqueeWidth = marqueeRect.width;

      // Swap width and height if direction is up or down
      if (direction === "up" || direction === "down") {
        containerWidth = containerRect.height;
        marqueeWidth = marqueeRect.height;
      }

      if (autoFill && containerWidth && marqueeWidth) {
        setMultiplier(
          marqueeWidth < containerWidth
            ? Math.ceil(containerWidth / marqueeWidth)
            : 1
        );
      } else {
        setMultiplier(1);
      }

      setContainerWidth(containerWidth);
      setMarqueeWidth(marqueeWidth);
    }
  }, [autoFill, containerRef, direction]);

  // Calculate width and multiplier on mount and on window resize
  useEffect(() => {
    if (!isMounted) return;

    calculateWidth();
    if (marqueeRef.current && containerRef.current) {
      const resizeObserver = new ResizeObserver(() => calculateWidth());
      resizeObserver.observe(containerRef.current);
      resizeObserver.observe(marqueeRef.current);
      return () => {
        if (!resizeObserver) return;
        resizeObserver.disconnect();
      };
    }
  }, [calculateWidth, containerRef, isMounted]);

  // Recalculate width when children change
  useEffect(() => {
    calculateWidth();
  }, [calculateWidth, children]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Runs the onMount callback, if it is a function, when Marquee is mounted.
  useEffect(() => {
    if (typeof onMount === "function") {
      onMount();
    }
  }, []);

  // Animation duration
  const duration = useMemo(() => {
    if (autoFill) {
      return (marqueeWidth * multiplier) / speed;
    } else {
      return marqueeWidth < containerWidth
        ? containerWidth / speed
        : marqueeWidth / speed;
    }
  }, [autoFill, containerWidth, marqueeWidth, multiplier, speed]);

  // Function to get the current translation value from the marquee
  const getCurrentTranslation = useCallback(() => {
    if (!firstMarqueeRef.current) return 0;

    try {
      // Get computed style of the element
      const style = window.getComputedStyle(firstMarqueeRef.current);
      const transform = style.getPropertyValue("transform");

      // No transform or identity matrix means position is at 0
      if (transform === "none" || transform === "matrix(1, 0, 0, 1, 0, 0)") {
        return 0;
      }

      // Parse the transform matrix to get the translateX value
      const matrix = transform.match(/matrix\((.+)\)/);
      if (matrix) {
        const values = matrix[1].split(", ");
        return parseFloat(values[4]);
      }

      return 0;
    } catch (error) {
      console.error("Error getting current translation:", error);
      return 0;
    }
  }, []);

  // Apply transform with requestAnimationFrame for smoother dragging
  useEffect(() => {
    // No need to run animation frame if not dragging
    if (!isDragging) {
      // Cancel any existing animation frame when dragging stops
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    // Initial animation position
    const initialPosition = animationPosition;

    // Smooth animation function using requestAnimationFrame
    const animateDrag = () => {
      if (!firstMarqueeRef.current || !secondMarqueeRef.current) return;

      // Calculate current transform
      const transformValue = `translateX(${
        initialPosition + currentDragOffsetRef.current
      }px)`;

      // Apply to both marquees
      [firstMarqueeRef.current, secondMarqueeRef.current].forEach((marquee) => {
        // Apply with a very slight transition for smoothness
        marquee.style.cssText += `
          transform: ${transformValue} !important; 
          transition: transform 0.05s linear !important;
        `
          .trim()
          .replace(/\s+/g, " ");
      });

      // Continue the animation loop
      animationFrameRef.current = requestAnimationFrame(animateDrag);
    };

    // Start the animation loop
    animationFrameRef.current = requestAnimationFrame(animateDrag);

    // Clean up when done
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isDragging, animationPosition]);

  // Start dragging - capture current position
  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!draggable) return;

      // Start dragging
      setIsDragging(true);

      // Get the correct client position based on direction
      const clientPos = ["left", "right"].includes(direction)
        ? "touches" in e
          ? e.touches[0].clientX
          : (e as React.MouseEvent).clientX
        : "touches" in e
        ? e.touches[0].clientY
        : (e as React.MouseEvent).clientY;

      // Store the initial drag position
      setDragStartPos(clientPos);

      // Get and store the current animation translation
      const currentTranslation = getCurrentTranslation();
      setAnimationPosition(currentTranslation);

      // Initialize drag offset
      currentDragOffsetRef.current = 0;

      e.preventDefault();
    },
    [draggable, direction, getCurrentTranslation]
  );

  // Handle drag movement
  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;

      // Get current position based on direction
      const clientPos = ["left", "right"].includes(direction)
        ? "touches" in e
          ? (e as TouchEvent).touches[0].clientX
          : (e as MouseEvent).clientX
        : "touches" in e
        ? (e as TouchEvent).touches[0].clientY
        : (e as MouseEvent).clientY;

      // Calculate the drag offset
      let newOffset = clientPos - dragStartPos;

      // For direction="up", we need to invert the drag direction
      // because the container is rotated -90 degrees
      if (direction === "up") {
        newOffset = -newOffset;
      }

      // Update the ref directly for smoother animation
      currentDragOffsetRef.current = newOffset;

      e.preventDefault();
    },
    [isDragging, dragStartPos, direction]
  );

  // End dragging
  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;

    // When drag ends, we want a smooth transition back to the animation
    // First, get the current marquee elements
    const marquees = [firstMarqueeRef.current, secondMarqueeRef.current].filter(
      Boolean
    );

    // Apply a brief transition for smooth resumption of animation
    marquees.forEach((marquee) => {
      if (marquee) {
        // Remove the CSS properties added during dragging
        marquee.style.cssText = marquee.style.cssText
          .replace(
            /\s*transform\s*:\s*translateX\([^)]+\)\s*!important\s*;/g,
            ""
          )
          .replace(
            /\s*transition\s*:\s*transform[^;]+!important\s*;/g,
            "transition: transform 3.3s ease-out !important;"
          );

        // Remove the transition after it completes
        setTimeout(() => {
          if (marquee)
            marquee.style.cssText = marquee.style.cssText.replace(
              /\s*transition\s*:\s*transform[^;]+!important\s*;/g,
              ""
            );
        }, 3300);
      }
    });

    // Reset state
    setIsDragging(false);
    currentDragOffsetRef.current = 0;
  }, [isDragging]);

  // Setup document event listeners for dragging
  useEffect(() => {
    // Only add events if draggable is enabled and we're currently dragging
    if (!draggable || !isDragging) return;

    // Add global event listeners to track drag movement
    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("touchmove", handleDragMove, { passive: false });
    document.addEventListener("mouseup", handleDragEnd);
    document.addEventListener("touchend", handleDragEnd);
    document.addEventListener("mouseleave", handleDragEnd);

    // Clean up event listeners when component unmounts or dragging ends
    return () => {
      document.removeEventListener("mousemove", handleDragMove);
      document.removeEventListener("touchmove", handleDragMove);
      document.removeEventListener("mouseup", handleDragEnd);
      document.removeEventListener("touchend", handleDragEnd);
      document.removeEventListener("mouseleave", handleDragEnd);
    };
  }, [draggable, isDragging, handleDragMove, handleDragEnd]);

  const containerStyle = useMemo(
    () => ({
      ...style,
      ["--pause-on-hover" as string]:
        !play || pauseOnHover ? "paused" : "running",
      ["--pause-on-click" as string]:
        !play || (pauseOnHover && !pauseOnClick) || pauseOnClick || draggable
          ? "paused"
          : "running",
      ["--width" as string]:
        direction === "up" || direction === "down" ? `100vh` : "100%",
      ["--transform" as string]:
        direction === "up"
          ? "rotate(-90deg)"
          : direction === "down"
          ? "rotate(90deg)"
          : "none",
    }),
    [style, play, pauseOnHover, pauseOnClick, direction, draggable]
  );

  const gradientStyle = useMemo(
    () => ({
      ["--gradient-color" as string]: gradientColor,
      ["--gradient-width" as string]:
        typeof gradientWidth === "number"
          ? `${gradientWidth}px`
          : gradientWidth,
    }),
    [gradientColor, gradientWidth]
  );

  const marqueeStyle = useMemo(
    () => ({
      ["--play" as string]: play ? "running" : "paused",
      ["--direction" as string]: direction === "left" ? "normal" : "reverse",
      ["--duration" as string]: `${duration}s`,
      ["--delay" as string]: `${delay}s`,
      ["--iteration-count" as string]: !!loop ? `${loop}` : "infinite",
      ["--min-width" as string]: autoFill ? `auto` : "100%",
    }),
    [play, direction, duration, delay, loop, autoFill]
  );

  const childStyle = useMemo(
    () => ({
      ["--transform" as string]:
        direction === "up"
          ? "rotate(90deg)"
          : direction === "down"
          ? "rotate(-90deg)"
          : "none",
    }),
    [direction]
  );

  // Render {multiplier} number of children
  const multiplyChildren = useCallback(
    (multiplier: number) => {
      return [
        ...Array(
          Number.isFinite(multiplier) && multiplier >= 0 ? multiplier : 0
        ),
      ].map((_, i) => (
        <Fragment key={i}>
          {Children.map(children, (child) => {
            return (
              <div style={childStyle} className="rfm-child">
                {child}
              </div>
            );
          })}
        </Fragment>
      ));
    },
    [childStyle, children]
  );

  return !isMounted ? null : (
    <div
      ref={containerRef}
      style={containerStyle}
      className={`rfm-marquee-container ${className} ${
        draggable ? "rfm-draggable" : ""
      } ${isDragging ? "rfm-dragging" : ""}`}
      onMouseDown={draggable ? handleDragStart : undefined}
      onTouchStart={draggable ? handleDragStart : undefined}
    >
      {gradient && <div style={gradientStyle} className="rfm-overlay" />}
      <div
        ref={firstMarqueeRef}
        className="rfm-marquee"
        style={marqueeStyle}
        onAnimationIteration={onCycleComplete}
        onAnimationEnd={onFinish}
      >
        <div className="rfm-initial-child-container" ref={marqueeRef}>
          {Children.map(children, (child) => {
            return (
              <div style={childStyle} className="rfm-child">
                {child}
              </div>
            );
          })}
        </div>
        {multiplyChildren(multiplier - 1)}
      </div>
      <div ref={secondMarqueeRef} className="rfm-marquee" style={marqueeStyle}>
        {multiplyChildren(multiplier)}
      </div>
    </div>
  );
});

export default Marquee;
