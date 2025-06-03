// Simple keyboard shortcuts for music player
export const initializeKeyboardShortcuts = (playerContext) => {
  const handleKeyPress = (event) => {
    // Don't trigger shortcuts when typing in inputs
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }

    switch (event.code) {
      case 'Space':
        event.preventDefault();
        playerContext.togglePlayPause();
        break;
      case 'ArrowRight':
        if (event.ctrlKey) {
          event.preventDefault();
          playerContext.nextTrack();
        }
        break;
      case 'ArrowLeft':
        if (event.ctrlKey) {
          event.preventDefault();
          playerContext.previousTrack();
        }
        break;
      case 'ArrowUp':
        if (event.ctrlKey) {
          event.preventDefault();
          const newVolume = Math.min(1, playerContext.volume + 0.1);
          playerContext.setVolume(newVolume);
        }
        break;
      case 'ArrowDown':
        if (event.ctrlKey) {
          event.preventDefault();
          const newVolume = Math.max(0, playerContext.volume - 0.1);
          playerContext.setVolume(newVolume);
        }
        break;
      case 'KeyM':
        if (event.ctrlKey) {
          event.preventDefault();
          playerContext.toggleMute();
        }
        break;
    }
  };

  document.addEventListener('keydown', handleKeyPress);

  // Return cleanup function
  return () => {
    document.removeEventListener('keydown', handleKeyPress);
  };
};

// Display shortcuts help
export const getShortcutsHelp = () => {
  return [
    { key: 'Space', action: 'Play/Pause' },
    { key: 'Ctrl + →', action: 'Next Track' },
    { key: 'Ctrl + ←', action: 'Previous Track' },
    { key: 'Ctrl + ↑', action: 'Volume Up' },
    { key: 'Ctrl + ↓', action: 'Volume Down' },
    { key: 'Ctrl + M', action: 'Mute/Unmute' }
  ];
}; 