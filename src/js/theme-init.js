    (function() {
      const saved  = localStorage.getItem('eduyomi-theme')  || localStorage.getItem('ej-synced-theme')  || localStorage.getItem('ej-theme')  || 'dark';
      const accent = localStorage.getItem('eduyomi-accent') || localStorage.getItem('ej-synced-accent') || localStorage.getItem('ej-accent') || '#7c6af7';
      document.documentElement.setAttribute('data-theme', saved);
      document.documentElement.style.setProperty('--accent-custom', accent);
      // Init logo accent filter
      (function() {
        function hexToHue(hex) {
          const r = parseInt(hex.slice(1,3),16)/255;
          const g = parseInt(hex.slice(3,5),16)/255;
          const b = parseInt(hex.slice(5,7),16)/255;
          const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min;
          if (d === 0) return 0;
          let h = max === r ? ((g-b)/d)%6 : max === g ? (b-r)/d+2 : (r-g)/d+4;
          return Math.round(h * 60 + 360) % 360;
        }
        function hexToHueInit(hex) {
          const r = parseInt(hex.slice(1,3),16)/255;
          const g = parseInt(hex.slice(3,5),16)/255;
          const b = parseInt(hex.slice(5,7),16)/255;
          const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min;
          if (d === 0) return 0;
          let h = max === r ? ((g-b)/d)%6 : max === g ? (b-r)/d+2 : (r-g)/d+4;
          return Math.round(h * 60 + 360) % 360;
        }
        const hue = hexToHueInit(accent);
        const rotation = hue - 38;
        document.documentElement.style.setProperty('--logo-accent-hue',
          `grayscale(1) sepia(1) hue-rotate(${rotation}deg) saturate(2) brightness(1.1)`);
      })();
    })();
  </script>
