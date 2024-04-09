import React, { useEffect, useRef } from 'react';

export function CartPendulum({ cartPosition, pendulumAngle }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { antialias: true });
    ctx.imageSmoothingEnabled = false;  // Turn on for smoother scaling

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous frame

      drawCart(ctx, cartPosition, pendulumAngle)
      //drawPendulum(ctx, cartPosition, pendulumAngle);
    };

    let animationId;
    const animate = () => {
      render();
      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationId);
  }, [cartPosition, pendulumAngle]);

  return (
    <canvas ref={canvasRef}></canvas>
  );
}

// Helper functions for drawing
function drawCart(ctx, x, angle) {
  const cartWidth = 50;
  const cartHeight = 20;
  const wheelRadius = 5;
  const groundHeight = 100;

  x = 150 + x % (ctx.canvas.width);
  if (Math.abs(x) > ctx.canvas.width / 2) {
    x = x % (ctx.canvas.width)
  }// Wrap around the canvas
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(x - cartWidth / 2, groundHeight - cartHeight, cartWidth, cartHeight); // Cart body
  ctx.beginPath();
  ctx.arc(x - cartWidth / 2, groundHeight, wheelRadius, 0, 2 * Math.PI); // Left wheel
  ctx.arc(x + cartWidth / 2, groundHeight, wheelRadius, 0, 2 * Math.PI); // Right wheel
  ctx.fillStyle = '#34495e';
  ctx.fill();
  drawPendulum(ctx, x, angle); // Draw the pendulum
}

function drawPendulum(ctx, cartX, angle) {
  const pendulumLength = 45; // Example length
  const pivotX = cartX;
  const groundHeight = 100;
  const pivotY = groundHeight - 18; // Assuming the pivot is at the top of the cart


  // Calculate pendulum endpoint using trigonometry
  const endX = pivotX + pendulumLength * Math.sin(angle);
  const endY = pivotY - pendulumLength * Math.cos(angle);

  // Draw the pendulum
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 3;
  ctx.strokeStyle = '#2c3e50'
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY); // Start at the pivot point
  ctx.lineTo(endX, endY);     // Line to the pendulum's end
  ctx.stroke();
  ctx.shadowBlur = 0; // Reset shadow

  // Draw the pendulum bob (optional)
  ctx.beginPath();
  ctx.arc(endX, endY, 5, 0, 2 * Math.PI); // Circle for the bob
  ctx.fillStyle = '#c0392b'; // Fill with a color
  ctx.fill();
}

export default CartPendulum;
