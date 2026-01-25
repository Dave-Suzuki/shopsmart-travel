import confetti from 'canvas-confetti';

// Celebration confetti for saving money (saving item for later)
export function celebrateSaving() {
  // Burst of colorful confetti from both sides
  const duration = 2000;
  const end = Date.now() + duration;

  // Rainbow/party colors
  const colors = ['#ff0000', '#ff7700', '#ffdd00', '#00ff00', '#0099ff', '#6633ff', '#ff00ff'];

  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors: colors,
    });
    confetti({
      particleCount: 4,
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
  // Gold coins falling from top to bottom
  const goldColors = ['#ffd700', '#ffb700', '#ff9500', '#daa520', '#f4a460'];
  const duration = 1500;
  const end = Date.now() + duration;

  (function frame() {
    // Random x position across the top
    confetti({
      particleCount: 3,
      angle: 270, // Straight down
      spread: 30,
      startVelocity: 10,
      gravity: 1.5,
      ticks: 300,
      colors: goldColors,
      scalar: 1.3,
      origin: { x: Math.random(), y: 0 }, // Random position at top
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}
