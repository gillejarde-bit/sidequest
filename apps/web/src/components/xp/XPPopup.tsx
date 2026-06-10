import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useXPStore } from '../../stores/xpStore';

function AutoClear({ eventId, clearXPEvent }: { eventId: string, clearXPEvent: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      clearXPEvent(eventId);
    }, 1500); // Hold 1.5s
    return () => clearTimeout(timer);
  }, [eventId, clearXPEvent]);
  return null;
}

export function XPPopup() {
  const { pendingXP, clearXPEvent } = useXPStore();

  return (
    <div className="fixed bottom-[120px] left-0 right-0 flex flex-col items-center pointer-events-none z-[1000]">
      <AnimatePresence>
        {pendingXP.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="bg-[var(--sq-surface)] text-[var(--sq-text)] px-5 py-3 rounded-full flex items-center shadow-lg"
            style={{
              marginBottom: index < pendingXP.length - 1 ? '60px' : '0px',
              position: 'relative'
            }}
          >
            <AutoClear eventId={event.id} clearXPEvent={clearXPEvent} />
            <span className="mr-3 text-2xl">{(event as any).emoji}</span>
            <span className="text-green-400 font-bold mx-2 text-lg">+{event.points} XP</span>
            <span className="text-gray-300 ml-3 font-medium">{(event as any).label}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
