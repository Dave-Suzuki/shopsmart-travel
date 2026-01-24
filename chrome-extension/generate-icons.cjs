/**
 * Generate extension icons using Node.js canvas
 *
 * Run: npm install canvas && node generate-icons.js
 *
 * Or manually create icons from the icon.svg file using:
 * - Online converter: https://convertio.co/svg-png/
 * - ImageMagick: convert -resize 16x16 icon.svg icon16.png
 */

// Simple placeholder - creates blue squares with a cart symbol
// For production, use proper icon design tools

const fs = require('fs');
const path = require('path');

// Base64 encoded minimal PNG icons (blue squares as placeholders)
// These are temporary - replace with proper icons for production

const icons = {
  16: `iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA5ElEQVQ4T6WTzQ3CMBCE5w0UIIoABUAJUAJ0QAnQAekkdOIrR26EEkiJNJZW+QFn4WgjKfaM5/O+dQj4cYQaHaP8wB5T2AZxJz4kfMVPYhdsJvCIuwU8gU1JsBfrYAmV8M4BnrBQbAj7EAVXPFFgqdiDnwRPYB3EPqzMDZwEz+AYfCQIE5xCRwJZb6CAb4K9EK8v7MBKfOdJIDnYCf+NIMvBs/R5/IqSE3QINg7k1xAEWQfpwlvSJ4JgT4LURf4EPAkCc8EdiGpf0G+CwFzwAF4liP4WJCR4AusEbgnSeUeH4APdQlkRYk5ETQAAAABJRU5ErkJggg==`,
  48: `iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABz0lEQVRoQ+2Z7W3CMBCG74wQVgBGACNAJ4BRYBPQCWCUFWCE0gmADcIIYQQygv39I1IlgeNy/kCKrViy8u7zvX62L07i8MMTPq6HP6APMOsT/DvgZwBLAG6Ar/rh1oJsALxVFJnKXfuaB/CuAvABfFQFINsDG1VxC3KkY00rAJwAd6s5kNmBJ+CyIsCMX98ANxUAPoFLdcbTNmDqHnBVFYBX4EL90LQR+PYJXKirW8kKxKrzq34BeAQOqxLIqWPZCOS8p+w+shK4dTxC3X2CVAXgHrgAjqsSyJnfMvvI6k8ssB2btwVSdcB1bN4uVqoKwJV3b+gHKMb2vANzO3YfW/hT44ggcwMj6t7Q86ZOYGY9zzIAR/jCLpYz7z4AV/jSLpYzH9IDXlWBLAjTGGAnuAfOVQXg0TukB3xWBTJbsA/swmNVIIt/Pwl+kd7oD/0Iz8EePAEuVQHM/EjPQU4PeFYFsqAHE0B2G0ld0Au/CALZbSR14Qk4qgqYuQU8wUGqQGYHnoGLqoAdvoQCKxY4VB2bNwJJHciJj9o/SFXAfexdG7f/B4nJlrULxWLzmv1cLDZvLAbZB+BFHXBZQCY+0gN+gB/gCjirSmDmPtIDvoAr1QH4AgC+kS8WYoMJAAAAAElFTkSuQmCC`,
  128: `iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAEQElEQVR4nO3dwW3jMBCF4UkfKUC1pJa0khLSS2pJLWklLqA+fwjoyyLM8DGipSj6H3Axko00fKRGduLwBQAAAAAAAAAAAAAAAAC4qG0HXP3nJ1TjFzgHAAAAAAAAAAAAAAAAAPyH2wF/AOCnewG/+uGW9m0BvKhIM5W79rUOwLsSgB/ARVWAb+CuKuAGOFEXpyBLOpqUAG7Ax2oOJHbgHrhZFdABb+qKVrICca58+gDcALeqAlwC56oCPgOX6om2MgKx6vy0fwi4B3aqEsjpw7wRyHlO2WNkJXAX+Ai1jwlSVQB3wBVwtiqBnPmp5pHVH1lgO7bqC6SqA66q6i5Wqgq48e5t+gGKsV2PYK7H7qsLv2q8IgjcgIi6V/S66RMoWM+zDMAVfmIX5sy7D8ANfrSL5czHdIBXVSALwjQF2Al+A5dVARfCKT3gWRXIbME5sAt3VYEsfv0k+I/0tj/0Kzx3t+AVcKoKmPktnYPsCfCsCmRBnUwA2W0kdcEJuKoKJnbgHnCTKpDZgQvgpCpggy+hwIoFrtSxVSOQ1IGc+Kj9rVQF3Mbe0rj9H0hMtrJdKBab1+znYrF5azHIPgBP6oDLCjLxkR7wC/gD3ADnqhJmbkFPcJAqkNmBF+CiKuCAL6HCigXOVcc2jUBSB3LiC+1vpyrgMfatzej/QWKyFe1CsdiiZjsXi81riwH2HXhWB1wWkIl3dIA/wF/gCjhTlTBzn+gBv4AzdQC+kEtofY/cgHt1dS9OQM7cWwpcqA64BD5TBYRZuhfwRwkgjDI18OuGewDuqgKq7cAD+LwEQCY9cvE3wIMSAF8AZ+piU5mAnX7CPYBzJYDPwI2qaJUsQaYz7gE8V5fgJC6hP07wCbxRAuBz4Ep16qZKkWnbfgJXSgCsjLtv4IESACunLr2AG8V7hHBuBzLq1lzAKa5eCX9UbQe8OhGk+oiwE4h0b+pAYgXu4hREqxKk1wEP4HJFwAcg7A/tC7ycAnl1IOzLu3/gT6oHIO3LawJ/qKqBUHsB+gd+pwpA3An4F/hZVQBKbUC/wAsVZEZdmxtwtAKo2QE3KwJcqQ5cqSpgQ50P+P/AH6oCVNuAB/F5CYBMeuHiN+BBXULxNuFt9E78ARwqAfCJ7sV8JsAHAfjPsWUlPBPHqgI0NHECuFcVcJ0owC34swQQxtbpY0Td4i54VxXwnCjAc+ICXK8IWFHHE3iFG+BWVcB5MgFX4CvgZkXAPXErPvYZuFLnbKgUmc7sRb4Ct6oCVtThhR7AY1Wx4m3CA3gsgPw64E11alZKkemEe/ABuF0R8B74BpypiqmmA27Bz0sAIXYC/AZ+VQUgqw04E1+WAMikFy5+Bx7VJYS3CTfoHfidKgBlJ+Av4JcqAEvqeDIvdANuVwU8kUnwJ/CYqoC1dDyZF7kDT6sKeMkE/A78qgqY+oiwE4h0N/VRwnpch//+g0z98h+a/hLo/H9vPAAAAABJRU5ErkJggg==`
};

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'icons');

// Write icon files
Object.entries(icons).forEach(([size, base64]) => {
  const filename = path.join(iconsDir, `icon${size}.png`);
  const buffer = Buffer.from(base64, 'base64');
  fs.writeFileSync(filename, buffer);
  console.log(`Created ${filename}`);
});

console.log('Done! Icons generated.');
