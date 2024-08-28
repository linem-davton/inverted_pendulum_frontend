import { useEffect, useRef } from "react";

const cartColor = "hsla(180, 30%, 30%, 1)";
const pendulumColor = "hsla(30, 70%, 60%, 1)";

export function CartPendulum({
  cartPosition,
  pendulumAngle,
}: {
  cartPosition: number;
  pendulumAngle: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", {
      antialias: true,
    }) as CanvasRenderingContext2D;
    const render = () => {
      ctx?.clearRect(0, 0, canvas?.width || 0, canvas?.height || 0); // Clear previous frame

      drawCart(ctx, cartPosition, pendulumAngle);
      //drawPendulum(ctx, cartPosition, pendulumAngle);
    };

    let animationId: number;
    const animate = () => {
      render();
      animationId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationId);
  }, [cartPosition, pendulumAngle]);

  return <canvas ref={canvasRef}></canvas>;
}

// Helper functions for drawing
function drawCart(ctx: CanvasRenderingContext2D, x: number, angle: number) {
  const cartWidth = 50;
  const cartHeight = 20;
  const wheelRadius = 5;
  const groundHeight = 100;

  x = 150 + (x % ctx.canvas.width);
  if (Math.abs(x) > ctx.canvas.width / 2) {
    x = x % ctx.canvas.width;
  } // Wrap around the canvas
  ctx.fillStyle = cartColor;
  ctx.fillRect(
    x - cartWidth / 2,
    groundHeight - cartHeight,
    cartWidth,
    cartHeight,
  ); // Cart body
  ctx.beginPath();
  ctx.arc(x - cartWidth / 2, groundHeight, wheelRadius, 0, 2 * Math.PI); // Left wheel
  ctx.arc(x + cartWidth / 2, groundHeight, wheelRadius, 0, 2 * Math.PI); // Right wheel
  ctx.fillStyle = cartColor;
  ctx.fill();
  drawPendulum(ctx, x, angle); // Draw the pendulum
}

function drawPendulum(
  ctx: CanvasRenderingContext2D,
  cartX: number,
  angle: number,
) {
  const pendulumLength = 45; // Example length
  const pivotX = cartX;
  const groundHeight = 100;
  const pivotY = groundHeight - 18; // Assuming the pivot is at the top of the cart

  // Calculate pendulum endpoint using trigonometry
  const endX = pivotX + pendulumLength * Math.sin(angle);
  const endY = pivotY - pendulumLength * Math.cos(angle);

  // Draw the pendulum
  ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 3;
  ctx.strokeStyle = cartColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY); // Start at the pivot point
  ctx.lineTo(endX, endY); // Line to the pendulum's end
  ctx.stroke();
  ctx.shadowBlur = 0; // Reset shadow

  // Draw the pendulum bob (optional)
  ctx.beginPath();
  ctx.arc(endX, endY, 5, 0, 2 * Math.PI); // Circle for the bob
  ctx.fillStyle = pendulumColor; // Fill with a color
  ctx.fill();
}

export default CartPendulum;
