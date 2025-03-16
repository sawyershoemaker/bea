
module.exports = function(bot) {
  if (!bot.entity) {
    console.log("Bot entity not available; skipping anti-AFK actions.");
    return;
  }
  
  try {
    // get current orientation
    const currentYaw = bot.entity.yaw;
    const currentPitch = bot.entity.pitch;
    
    // determine a small random delta for natural movement
    const yawDelta = (Math.random() * 0.3) - 0.15;   // +/- 0.15 radians (~8.6°)
    const pitchDelta = (Math.random() * 0.2) - 0.1;    // +/- 0.1 radians (~5.7°)
    const targetYaw = currentYaw + yawDelta;
    const targetPitch = currentPitch + pitchDelta;
    
    // smoothly adjust head movement using an exponential easing function over 1.5 seconds
    smoothLook(bot, currentYaw, currentPitch, targetYaw, targetPitch, 1500);
    
    // occasionally jump (50% chance)
    if (Math.random() < 0.5) {
      bot.setControlState('jump', true);
      setTimeout(() => {
        bot.setControlState('jump', false);
      }, 200);
    }
    
    // move forward briefly to simulate a short step
    bot.setControlState('forward', true);
    setTimeout(() => {
      bot.setControlState('forward', false);
    }, 1200);
    
    // occasionally perform a single arm swing (50% chance)
    if (Math.random() < 0.5) {
      setTimeout(() => {
        bot.swingArm();
      }, 300);
    }
    
    console.log("Anti-AFK action performed.");
  } catch (error) {
    console.error("Error in anti-AFK action:", error);
  }
};

// function to smoothly transition the bot's view with an exponential easing curve
function smoothLook(bot, startYaw, startPitch, targetYaw, targetPitch, duration) {
  const startTime = Date.now();
  const interval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const t = Math.min(elapsed / duration, 1);
    const easeT = easeOutExpo(t);
    const newYaw = startYaw + (targetYaw - startYaw) * easeT;
    const newPitch = startPitch + (targetPitch - startPitch) * easeT;

    bot.look(newYaw, newPitch, false);
    
    if (t === 1) {
      clearInterval(interval);
    }
  }, 16); // roughly 60 updates per second
}

// exponential ease-out function for smooth deceleration
function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}