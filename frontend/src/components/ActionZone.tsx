import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceStore } from '@/store/index';
import WeatherWidget from '@/components/widgets/WeatherWidget';
import SmartHomeWidget from '@/components/widgets/SmartHomeWidget';
import MusicWidget from '@/components/widgets/MusicWidget';
import AIResponseWidget from '@/components/widgets/AIResponseWidget';
import DefaultWidget from '@/components/widgets/DefaultWidget';

export default function ActionZone() {
  const { detectedIntent, actionWidgets, isLoadingWidgets, loadActionWidgets } = useVoiceStore();

  useEffect(() => {
    loadActionWidgets();
  }, [loadActionWidgets]);

  const renderWidget = () => {
    const widgetData = actionWidgets.find(w => w.widgetType === detectedIntent);

    switch (detectedIntent) {
      case 'weather':
        return <WeatherWidget data={widgetData} />;
      case 'smart_home':
        return <SmartHomeWidget data={widgetData} />;
      case 'music':
        return <MusicWidget data={widgetData} />;
      case 'ai_response':
        return <AIResponseWidget data={widgetData} />;
      default:
        return <DefaultWidget />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-heading font-semibold text-foreground">
          Action Zone
        </h2>
        {detectedIntent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-3 py-1.5 bg-electric-teal/10 rounded border border-electric-teal/30"
          >
            <span className="text-xs font-semibold text-electric-teal uppercase tracking-wider">
              {detectedIntent}
            </span>
          </motion.div>
        )}
      </div>

      <div className="flex-1 min-h-0">
        {isLoadingWidgets ? null : (
          <AnimatePresence mode="wait">
            <motion.div
              key={detectedIntent || 'default'}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              {renderWidget()}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
