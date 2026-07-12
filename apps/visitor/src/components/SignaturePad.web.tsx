import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export interface SignaturePadHandle {
  /** Asks the pad for its content; results arrive via onSignature/onEmpty. */
  read: () => void;
  clear: () => void;
}

export interface SignaturePadProps {
  onSignature: (pngDataUrl: string) => void;
  onEmpty?: () => void;
}

/**
 * Web implementation drawing straight onto an HTML canvas —
 * react-native-signature-canvas is WebView-based and has no web support.
 */
export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad({ onSignature, onEmpty }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const hasInkRef = useRef(false);

    useImperativeHandle(ref, () => ({
      read: () => {
        const canvas = canvasRef.current;
        if (!canvas || !hasInkRef.current) {
          onEmpty?.();
          return;
        }
        onSignature(canvas.toDataURL('image/png'));
      },
      clear: () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        hasInkRef.current = false;
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const scale = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(scale, scale);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      let drawing = false;

      const pos = (e: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      };

      const down = (e: PointerEvent) => {
        drawing = true;
        canvas.setPointerCapture(e.pointerId);
        const { x, y } = pos(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
      };
      const move = (e: PointerEvent) => {
        if (!drawing) return;
        const { x, y } = pos(e);
        ctx.lineTo(x, y);
        ctx.stroke();
        hasInkRef.current = true;
      };
      const up = () => {
        drawing = false;
      };

      canvas.addEventListener('pointerdown', down);
      canvas.addEventListener('pointermove', move);
      canvas.addEventListener('pointerup', up);
      canvas.addEventListener('pointerleave', up);
      return () => {
        canvas.removeEventListener('pointerdown', down);
        canvas.removeEventListener('pointermove', move);
        canvas.removeEventListener('pointerup', up);
        canvas.removeEventListener('pointerleave', up);
      };
    }, []);

    return (
      <canvas
        ref={canvasRef}
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          border: '1px solid #d1d5db',
          backgroundColor: '#ffffff',
          touchAction: 'none',
        }}
      />
    );
  },
);
