import toast, { ToastOptions } from 'react-hot-toast';

// Create a simple notification sound using Web Audio API
function playNotificationSound() {
  try {
    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create oscillator for the sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Configure sound (pleasant notification tone)
    oscillator.frequency.value = 800; // Frequency in Hz
    oscillator.type = 'sine';
    
    // Configure volume envelope
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    // Play the sound
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
    
    // Clean up
    setTimeout(() => {
      audioContext.close();
    }, 500);
  } catch (error) {
    // Fallback: If Web Audio API fails, try HTML5 audio
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGWi77+efTRAMUKfj8LZjHAY4kdfyzHksBSR3x/DdkEAKFF606euoVRQKRp/g8r5sIQUrgc7y2Yk2CBlou+/nn00QDFCn4/C2YxwGOJHX8sx5LAUkd8fw3ZBAC');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Silently fail if audio cannot play
      });
    } catch (e) {
      // Silently fail if all audio methods fail
    }
  }
}

export interface ToastWithSoundOptions extends ToastOptions {
  playSound?: boolean;
}

/**
 * Show a toast notification with optional sound
 * @param message - The message to display
 * @param options - Toast options including playSound flag
 */
export function toastWithSound(
  message: string | React.ReactNode,
  options: ToastWithSoundOptions = {}
) {
  const { playSound = true, ...toastOptions } = options;
  
  if (playSound) {
    playNotificationSound();
  }
  
  return toast(message, {
    duration: 4000,
    position: 'top-right',
    style: {
      backgroundColor: '#ffffff',
      color: '#1f2937',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      padding: '16px 20px',
      maxWidth: '400px',
      fontSize: '14px',
      fontWeight: '500',
    },
    ...toastOptions,
  });
}

/**
 * Show a success toast with sound
 */
export function toastSuccess(
  message: string | React.ReactNode,
  options: ToastWithSoundOptions = {}
) {
  return toastWithSound(message, {
    icon: '✅',
    style: {
      ...toastWithSound('', {}).style,
      borderColor: '#10b981',
      backgroundColor: '#f0fdf4',
    },
    ...options,
  });
}

/**
 * Show an error toast with sound
 */
export function toastError(
  message: string | React.ReactNode,
  options: ToastWithSoundOptions = {}
) {
  return toastWithSound(message, {
    icon: '❌',
    style: {
      ...toastWithSound('', {}).style,
      borderColor: '#ef4444',
      backgroundColor: '#fef2f2',
    },
    ...options,
  });
}

/**
 * Show an info toast with sound
 */
export function toastInfo(
  message: string | React.ReactNode,
  options: ToastWithSoundOptions = {}
) {
  return toastWithSound(message, {
    icon: 'ℹ️',
    style: {
      ...toastWithSound('', {}).style,
      borderColor: '#3b82f6',
      backgroundColor: '#eff6ff',
    },
    ...options,
  });
}

/**
 * Show a warning toast with sound
 */
export function toastWarning(
  message: string | React.ReactNode,
  options: ToastWithSoundOptions = {}
) {
  return toastWithSound(message, {
    icon: '⚠️',
    style: {
      ...toastWithSound('', {}).style,
      borderColor: '#f59e0b',
      backgroundColor: '#fffbeb',
    },
    ...options,
  });
}

