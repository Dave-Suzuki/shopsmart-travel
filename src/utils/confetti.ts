import confetti from 'canvas-confetti';

// Celebration confetti for saving money (saving item for later)
export function celebrateSaving() {
  // Burst of colorful confetti from both sides
  const duration = 2000;
  const end = Date.now() + duration;

  const colors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0']; // Green shades for savings

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors: colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors: colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}

// Coins confetti for spending more (restoring item from saved)
export function showCoins() {
  // Gold/coin colored confetti falling from top - using gold colors
  const goldColors = ['#ffd700', '#ffb700', '#ff9500', '#daa520', '#f4a460'];

  confetti({
    particleCount: 40,
    spread: 360,
    ticks: 100,
    gravity: 0.8,
    decay: 0.94,
    startVelocity: 30,
    colors: goldColors,
    scalar: 1.2,
    origin: { x: 0.3, y: 0.2 },
  });

  confetti({
    particleCount: 40,
    spread: 360,
    ticks: 100,
    gravity: 0.8,
    decay: 0.94,
    startVelocity: 30,
    colors: goldColors,
    scalar: 1.2,
    origin: { x: 0.7, y: 0.2 },
  });

  // Additional burst from center
  setTimeout(() => {
    confetti({
      particleCount: 30,
      spread: 360,
      ticks: 100,
      gravity: 0.8,
      decay: 0.94,
      startVelocity: 30,
      colors: goldColors,
      scalar: 1.2,
      origin: { x: 0.5, y: 0.3 },
    });
  }, 150);
}
