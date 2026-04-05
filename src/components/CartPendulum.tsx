import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";

const sceneColors = {
  rail: "rgba(147, 167, 181, 0.34)",
  railGlow: "rgba(89, 211, 255, 0.16)",
  cartBodyStart: "#8eeaff",
  cartBodyEnd: "#2f7fc8",
  cartTrim: "rgba(232, 247, 255, 0.72)",
  cartShadow: "rgba(0, 0, 0, 0.28)",
  wheelOuter: "#071017",
  wheelRing: "rgba(114, 216, 255, 0.68)",
  wheelHub: "#95f871",
  rod: "#d5e6ef",
  rodShadow: "rgba(0, 0, 0, 0.22)",
  pivot: "#dff8ff",
  bobCore: "#ff9a4d",
  bobGlow: "rgba(255, 154, 77, 0.24)",
  guide: "rgba(147, 167, 181, 0.16)",
};

interface MotionState {
  cartPosition: number;
  pendulumAngle: number;
}

interface SceneSize {
  width: number;
  height: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function normalizeAngleDelta(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function unwrapAngle(nextAngle: number, referenceAngle: number) {
  return referenceAngle + normalizeAngleDelta(nextAngle - referenceAngle);
}

function positiveModulo(value: number, base: number) {
  return ((value % base) + base) % base;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + safeRadius, safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.arcTo(
    x + width,
    y + height,
    x + width - safeRadius,
    y + height,
    safeRadius,
  );
  ctx.lineTo(x + safeRadius, y + height);
  ctx.arcTo(x, y + height, x, y + height - safeRadius, safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.arcTo(x, y, x + safeRadius, y, safeRadius);
  ctx.closePath();
}

function resizeCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  sceneSizeRef: MutableRefObject<SceneSize>,
) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  sceneSizeRef.current = { width, height };
}

function drawTrack(
  ctx: CanvasRenderingContext2D,
  width: number,
  railY: number,
  inset: number,
  surfaceOffset: number,
) {
  const platformHeight = 26;
  const railHeight = 12;
  const railWidth = width - inset * 2;
  const railX = inset;
  const platformY = railY - 4;
  const deckSpacing = 108;
  const deckWidth = 92;
  const deckOffset = positiveModulo(surfaceOffset * 0.85, deckSpacing);

  const platformGradient = ctx.createLinearGradient(
    0,
    platformY,
    0,
    platformY + platformHeight,
  );
  platformGradient.addColorStop(0, "rgba(38, 53, 65, 0.88)");
  platformGradient.addColorStop(1, "rgba(12, 19, 25, 0.96)");

  const railGradient = ctx.createLinearGradient(0, railY - railHeight, 0, railY);
  railGradient.addColorStop(0, "rgba(113, 130, 145, 0.28)");
  railGradient.addColorStop(1, "rgba(33, 46, 56, 0.9)");

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.24)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 10;
  drawRoundedRect(
    ctx,
    railX - 10,
    platformY,
    railWidth + 20,
    platformHeight,
    12,
  );
  ctx.fillStyle = platformGradient;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.beginPath();
  ctx.moveTo(railX - 4, platformY + 5);
  ctx.lineTo(railX + railWidth + 4, platformY + 5);
  ctx.strokeStyle = "rgba(223, 248, 255, 0.16)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.save();
  drawRoundedRect(
    ctx,
    railX - 10,
    platformY,
    railWidth + 20,
    platformHeight,
    12,
  );
  ctx.clip();

  for (
    let deckX = railX - deckSpacing;
    deckX < railX + railWidth + deckSpacing;
    deckX += deckSpacing
  ) {
    const plateX = deckX - deckOffset;
    const plateGradient = ctx.createLinearGradient(
      plateX,
      platformY,
      plateX,
      platformY + platformHeight,
    );
    plateGradient.addColorStop(0, "rgba(214, 231, 240, 0.16)");
    plateGradient.addColorStop(1, "rgba(94, 116, 132, 0.08)");

    drawRoundedRect(
      ctx,
      plateX,
      platformY + 3,
      deckWidth,
      platformHeight - 6,
      7,
    );
    ctx.fillStyle = plateGradient;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(plateX + deckWidth - 6, platformY + 5);
    ctx.lineTo(plateX + deckWidth - 6, platformY + platformHeight - 5);
    ctx.strokeStyle = "rgba(240, 248, 252, 0.15)";
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }

  ctx.restore();

  drawRoundedRect(ctx, railX, railY - railHeight, railWidth, railHeight, 8);
  ctx.fillStyle = railGradient;
  ctx.fill();

  ctx.strokeStyle = sceneColors.railGlow;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(railX + 14, railY - railHeight / 2);
  ctx.lineTo(railX + railWidth - 14, railY - railHeight / 2);
  ctx.strokeStyle = "rgba(223, 248, 255, 0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();

  for (const supportX of [railX + 28, railX + railWidth - 44]) {
    drawRoundedRect(ctx, supportX, platformY + 6, 16, platformHeight - 10, 6);
    ctx.fillStyle = "rgba(13, 21, 27, 0.86)";
    ctx.fill();
  }

  ctx.restore();
}

function drawWheels(
  ctx: CanvasRenderingContext2D,
  cartX: number,
  wheelY: number,
  cartWidth: number,
  wheelRadius: number,
  rotation: number,
) {
  const wheelOffset = cartWidth * 0.28;
  const spokeAngles = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];

  for (const direction of [-1, 1] as const) {
    const wheelX = cartX + wheelOffset * direction;

    ctx.save();
    ctx.shadowColor = sceneColors.cartShadow;
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 10;

    ctx.beginPath();
    ctx.arc(wheelX, wheelY, wheelRadius, 0, Math.PI * 2);
    ctx.fillStyle = sceneColors.wheelOuter;
    ctx.fill();

    ctx.lineWidth = 2.4;
    ctx.strokeStyle = sceneColors.wheelRing;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.beginPath();
    ctx.arc(wheelX, wheelY, wheelRadius * 0.48, 0, Math.PI * 2);
    ctx.fillStyle = sceneColors.wheelHub;
    ctx.fill();

    ctx.strokeStyle = "rgba(232, 247, 255, 0.42)";
    ctx.lineWidth = 1.4;

    for (const spokeAngle of spokeAngles) {
      const angle = rotation + spokeAngle;
      ctx.beginPath();
      ctx.moveTo(wheelX, wheelY);
      ctx.lineTo(
        wheelX + Math.cos(angle) * wheelRadius * 0.66,
        wheelY + Math.sin(angle) * wheelRadius * 0.66,
      );
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(wheelX, wheelY, wheelRadius * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(235, 247, 252, 0.88)";
    ctx.fill();
    ctx.restore();
  }
}

function drawCartBody(
  ctx: CanvasRenderingContext2D,
  cartX: number,
  bodyTop: number,
  cartWidth: number,
  cartHeight: number,
) {
  const bodyLeft = cartX - cartWidth / 2;
  const bodyGradient = ctx.createLinearGradient(
    bodyLeft,
    bodyTop,
    bodyLeft + cartWidth,
    bodyTop + cartHeight,
  );
  bodyGradient.addColorStop(0, sceneColors.cartBodyStart);
  bodyGradient.addColorStop(1, sceneColors.cartBodyEnd);

  ctx.save();
  ctx.shadowColor = sceneColors.cartShadow;
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 16;

  drawRoundedRect(ctx, bodyLeft, bodyTop, cartWidth, cartHeight, cartHeight * 0.34);
  ctx.fillStyle = bodyGradient;
  ctx.fill();

  ctx.lineWidth = 1.4;
  ctx.strokeStyle = "rgba(223, 248, 255, 0.32)";
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  const canopyHeight = cartHeight * 0.24;
  drawRoundedRect(
    ctx,
    bodyLeft + cartWidth * 0.18,
    bodyTop + cartHeight * 0.12,
    cartWidth * 0.64,
    canopyHeight,
    canopyHeight * 0.45,
  );
  ctx.fillStyle = "rgba(229, 247, 255, 0.24)";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(bodyLeft + cartWidth * 0.16, bodyTop + cartHeight * 0.7);
  ctx.lineTo(bodyLeft + cartWidth * 0.84, bodyTop + cartHeight * 0.7);
  ctx.strokeStyle = sceneColors.cartTrim;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

function drawPendulum(
  ctx: CanvasRenderingContext2D,
  cartX: number,
  pivotY: number,
  angle: number,
  rodLength: number,
  bobRadius: number,
) {
  const endX = cartX + rodLength * Math.sin(angle);
  const endY = pivotY - rodLength * Math.cos(angle);
  const rodGradient = ctx.createLinearGradient(cartX, pivotY, endX, endY);

  rodGradient.addColorStop(0, "rgba(243, 249, 252, 0.98)");
  rodGradient.addColorStop(1, sceneColors.rod);

  ctx.save();
  ctx.lineCap = "round";
  ctx.shadowColor = sceneColors.rodShadow;
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;

  ctx.beginPath();
  ctx.moveTo(cartX, pivotY);
  ctx.lineTo(endX, endY);
  ctx.strokeStyle = rodGradient;
  ctx.lineWidth = 5.5;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.beginPath();
  ctx.arc(cartX, pivotY, bobRadius * 0.56, 0, Math.PI * 2);
  ctx.fillStyle = sceneColors.pivot;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(endX, endY, bobRadius * 1.7, 0, Math.PI * 2);
  ctx.fillStyle = sceneColors.bobGlow;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(endX, endY, bobRadius, 0, Math.PI * 2);
  const bobGradient = ctx.createRadialGradient(
    endX - bobRadius * 0.2,
    endY - bobRadius * 0.25,
    bobRadius * 0.2,
    endX,
    endY,
    bobRadius,
  );
  bobGradient.addColorStop(0, "#ffd3ad");
  bobGradient.addColorStop(1, sceneColors.bobCore);
  ctx.fillStyle = bobGradient;
  ctx.fill();

  ctx.lineWidth = 1.4;
  ctx.strokeStyle = "rgba(255, 227, 198, 0.52)";
  ctx.stroke();
  ctx.restore();
}

function drawCenterGuide(
  ctx: CanvasRenderingContext2D,
  width: number,
  topInset: number,
  railY: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(width / 2, topInset);
  ctx.lineTo(width / 2, railY - 42);
  ctx.strokeStyle = sceneColors.guide;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 12]);
  ctx.stroke();
  ctx.restore();
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  size: SceneSize,
  motion: MotionState,
) {
  const { width, height } = size;
  const railInset = 0;
  const cartWidth = clamp(width * 0.17, 88, 138);
  const cartHeight = cartWidth * 0.38;
  const wheelRadius = clamp(cartWidth * 0.14, 10, 18);
  const railToPivotOffset = wheelRadius * 1.58 + cartHeight * 0.86;
  const pivotYTarget = height * 0.46;
  const railY = pivotYTarget + railToPivotOffset;
  const wheelY = railY - wheelRadius * 1.1;
  const bodyBottom = wheelY - wheelRadius * 0.48;
  const bodyTop = bodyBottom - cartHeight;
  const bobRadius = clamp(wheelRadius * 0.9, 9, 15);
  const pivotY = bodyTop + cartHeight * 0.14;
  const pendulumClearance = bobRadius * 1.9 + 8;
  const rodLength = Math.max(
    72,
    Math.min(
      height * 0.44,
      pivotY - pendulumClearance,
      height - pivotY - pendulumClearance,
      190,
    ),
  );
  const pixelsPerUnit = Math.min(width * 0.17, 110);
  const desiredCartX = width / 2 + motion.cartPosition * pixelsPerUnit;
  const cartX = clamp(
    desiredCartX,
    railInset + cartWidth / 2,
    width - railInset - cartWidth / 2,
  );
  const surfaceOffset = desiredCartX - cartX;
  const wheelRotation =
    (motion.cartPosition * pixelsPerUnit) / Math.max(wheelRadius, 1);

  ctx.clearRect(0, 0, width, height);

  drawCenterGuide(ctx, width, 20, railY);
  drawTrack(ctx, width, railY, railInset, surfaceOffset);

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cartX, railY + 26, cartWidth * 0.34, wheelRadius * 1.05, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.fill();
  ctx.restore();

  drawWheels(ctx, cartX, wheelY, cartWidth, wheelRadius, wheelRotation);
  drawCartBody(ctx, cartX, bodyTop, cartWidth, cartHeight);
  drawPendulum(ctx, cartX, pivotY, motion.pendulumAngle, rodLength, bobRadius);
}

export function CartPendulum({
  cartPosition,
  pendulumAngle,
}: {
  cartPosition: number;
  pendulumAngle: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneSizeRef = useRef<SceneSize>({ width: 0, height: 0 });
  const targetMotionRef = useRef<MotionState>({ cartPosition, pendulumAngle });
  const currentMotionRef = useRef<MotionState>({ cartPosition, pendulumAngle });

  useEffect(() => {
    const previousTarget = targetMotionRef.current;

    targetMotionRef.current = {
      cartPosition,
      pendulumAngle: unwrapAngle(pendulumAngle, previousTarget.pendulumAngle),
    };
  }, [cartPosition, pendulumAngle]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d", { alpha: true }) as
      | CanvasRenderingContext2D
      | null;

    if (!ctx) {
      return;
    }

    resizeCanvas(canvas, ctx, sceneSizeRef);

    let frameId = 0;
    let lastFrameTime = performance.now();
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas(canvas, ctx, sceneSizeRef);
    });

    resizeObserver.observe(canvas);

    const animate = (time: number) => {
      const deltaTime = Math.min(32, time - lastFrameTime || 16);
      lastFrameTime = time;

      const positionBlend = 1 - Math.exp(-deltaTime / 110);
      const angleBlend = 1 - Math.exp(-deltaTime / 90);
      const targetMotion = targetMotionRef.current;
      const currentMotion = currentMotionRef.current;

      currentMotion.cartPosition = lerp(
        currentMotion.cartPosition,
        targetMotion.cartPosition,
        positionBlend,
      );
      currentMotion.pendulumAngle = lerp(
        currentMotion.pendulumAngle,
        targetMotion.pendulumAngle,
        angleBlend,
      );

      if (Math.abs(currentMotion.cartPosition - targetMotion.cartPosition) < 0.0005) {
        currentMotion.cartPosition = targetMotion.cartPosition;
      }

      if (Math.abs(currentMotion.pendulumAngle - targetMotion.pendulumAngle) < 0.0005) {
        currentMotion.pendulumAngle = targetMotion.pendulumAngle;
      }

      drawScene(ctx, sceneSizeRef.current, currentMotion);
      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);

    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Inverted pendulum simulation stage"
      role="img"
    />
  );
}

export default CartPendulum;
