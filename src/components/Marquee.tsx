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

type DarkModeGradient = {
  enabled: boolean;
  color: string;
  gradientWidth?: number;
} | null;

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
   * @description Dark mode gradient configuration
   * @type {{ enabled: boolean; color: string; gradientWidth?: number }}
   * @default null
   */
  darkModeGradient?: DarkModeGradient;
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
    direction = "left",
    speed = 50,
    delay = 0,
    loop = 0,
    gradient = false,
    gradientColor = "white",
    gradientWidth = 200,
    darkModeGradient = null,
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

  // Calculate width of container and marquee and set multiplier
  const calculateWidth = useCallback(() => {
    const container = containerRef.current;
    const marquee = marqueeRef.current;

    if (container && marquee) {
      const containerRect = container.getBoundingClientRect();
      const marqueeRect = marquee.getBoundingClientRect();
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
    const container = containerRef.current;
    const marquee = marqueeRef.current;

    if (container && marquee) {
      const resizeObserver = new ResizeObserver(() => calculateWidth());
      resizeObserver.observe(container);
      resizeObserver.observe(marquee);
      return () => {
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
  }, [onMount]);

  // Animation duration
  const duration = useMemo(() => {
    if (autoFill) {
      return (marqueeWidth * multiplier) / speed;
    }
    return marqueeWidth < containerWidth
      ? containerWidth / speed
      : marqueeWidth / speed;
  }, [autoFill, containerWidth, marqueeWidth, multiplier, speed]);

  const containerStyle = useMemo(
    () => ({
      ...style,
      ["--pause-on-hover" as string]:
        !play || pauseOnHover ? "paused" : "running",
      ["--pause-on-click" as string]:
        !play || (pauseOnHover && !pauseOnClick) || pauseOnClick
          ? "paused"
          : "running",
      ["--width" as string]:
        direction === "up" || direction === "down" ? "100vh" : "100%",
      ["--transform" as string]:
        direction === "up"
          ? "rotate(-90deg)"
          : direction === "down"
          ? "rotate(90deg)"
          : "none",
    }),
    [style, play, pauseOnHover, pauseOnClick, direction]
  );

  const gradientStyle = useMemo(() => {
    const darkModeEnabled = darkModeGradient?.enabled ?? false;
    const finalColor = darkModeEnabled
      ? darkModeGradient?.color
      : gradientColor;
    const finalWidth = darkModeEnabled
      ? darkModeGradient?.gradientWidth ?? gradientWidth
      : gradientWidth;

    return {
      ["--gradient-color" as string]: finalColor,
      ["--gradient-width" as string]:
        typeof finalWidth === "number" ? `${finalWidth}px` : finalWidth,
    };
  }, [gradientColor, gradientWidth, darkModeGradient]);

  const marqueeStyle = useMemo(
    () => ({
      ["--play" as string]: play ? "running" : "paused",
      ["--direction" as string]: direction === "left" ? "normal" : "reverse",
      ["--duration" as string]: `${duration}s`,
      ["--delay" as string]: `${delay}s`,
      ["--iteration-count" as string]: !!loop ? `${loop}` : "infinite",
      ["--min-width" as string]: autoFill ? "auto" : "100%",
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
          {Children.map(children, (child) => (
            <div style={childStyle} className="rfm-child">
              {child}
            </div>
          ))}
        </Fragment>
      ));
    },
    [childStyle, children]
  );

  if (!isMounted) return null;

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      className={`rfm-marquee-container ${className}`}
    >
      {gradient && <div style={gradientStyle} className="rfm-overlay" />}
      <div
        className="rfm-marquee"
        style={marqueeStyle}
        onAnimationIteration={onCycleComplete}
        onAnimationEnd={onFinish}
      >
        <div className="rfm-initial-child-container" ref={marqueeRef}>
          {Children.map(children, (child) => (
            <div style={childStyle} className="rfm-child">
              {child}
            </div>
          ))}
        </div>
        {multiplyChildren(multiplier - 1)}
      </div>
      <div className="rfm-marquee" style={marqueeStyle}>
        {multiplyChildren(multiplier)}
      </div>
    </div>
  );
});

export default Marquee;
