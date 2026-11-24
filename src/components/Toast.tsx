import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { ToastState } from '../lib/types';

interface Props {
  toast: ToastState | null;
  onClose: () => void;
}

export default function Toast({ toast, onClose }: Props) {
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(onClose, 3800);
    return () => window.clearTimeout(t);
  }, [toast, onClose]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={`${toast.tone}-${toast.text}`}
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.22 }}
            className={`pointer-events-auto flex max-w-md items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur ${
              toast.tone === 'ok'
                ? 'border-mint/40 bg-[#0f1f1a]/95 text-paper'
                : 'border-rose/40 bg-[#24141a]/95 text-paper'
            }`}
          >
            {toast.tone === 'ok' ? <CheckCircle2 size={18} className="shrink-0 text-mint" /> : <AlertTriangle size={18} className="shrink-0 text-rose" />}
            <span>{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
