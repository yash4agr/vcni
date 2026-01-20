import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Thermometer, Lock, Camera, Power } from 'lucide-react';
import { Image } from '@/components/ui/image';
import type { ActionWidgets } from '@/entities';

interface SmartHomeWidgetProps {
  data?: ActionWidgets;
}

export default function SmartHomeWidget({ data }: SmartHomeWidgetProps) {
  const config = data?.configurationJson ? JSON.parse(data.configurationJson) : null;
  
  const [devices, setDevices] = useState(config?.devices || [
    { id: 1, name: 'Living Room Lights', type: 'light', status: true, value: 80 },
    { id: 2, name: 'Thermostat', type: 'thermostat', status: true, value: 72 },
    { id: 3, name: 'Front Door Lock', type: 'lock', status: false, value: 0 },
    { id: 4, name: 'Security Camera', type: 'camera', status: true, value: 0 },
  ]);

  const toggleDevice = (id: number) => {
    setDevices(devices.map(device => 
      device.id === id ? { ...device, status: !device.status } : device
    ));
  };

  const getDeviceIcon = (type: string, status: boolean) => {
    const iconClass = `w-6 h-6 ${status ? 'text-electric-teal' : 'text-foreground/30'}`;
    switch (type) {
      case 'light':
        return <Lightbulb className={iconClass} />;
      case 'thermostat':
        return <Thermometer className={iconClass} />;
      case 'lock':
        return <Lock className={iconClass} />;
      case 'camera':
        return <Camera className={iconClass} />;
      default:
        return <Power className={iconClass} />;
    }
  };

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Header with Visual Asset */}
      {data?.visualAsset && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl overflow-hidden"
        >
          <Image 
            src={data.visualAsset} 
            alt="Smart home visualization"
            className="w-full h-48 object-cover"
            width={800}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-deep-space-blue to-transparent" />
          <div className="absolute bottom-4 left-4">
            <h3 className="text-2xl font-heading font-bold text-foreground">
              {data.displayName || 'Smart Home Control'}
            </h3>
          </div>
        </motion.div>
      )}

      {/* Device Grid */}
      <div className="grid grid-cols-2 gap-4 flex-1">
        {devices.map((device, index) => (
          <motion.div
            key={device.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className={`bg-deep-space-blue/40 rounded-2xl p-6 border transition-all duration-300 cursor-pointer ${
              device.status 
                ? 'border-electric-teal/40 shadow-[0_0_20px_rgba(0,255,255,0.1)]' 
                : 'border-white/10 hover:border-white/20'
            }`}
            onClick={() => toggleDevice(device.id)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-glassmorphism-overlay backdrop-blur-sm border border-white/10 flex items-center justify-center">
                {getDeviceIcon(device.type, device.status)}
              </div>
              <motion.div
                animate={{ 
                  backgroundColor: device.status ? '#00FFFF' : 'rgba(255,255,255,0.1)',
                }}
                className="w-12 h-6 rounded-full relative cursor-pointer"
              >
                <motion.div
                  animate={{ 
                    x: device.status ? 24 : 0,
                    backgroundColor: device.status ? '#0A0A0A' : '#666',
                  }}
                  className="absolute top-1 left-1 w-4 h-4 rounded-full"
                />
              </motion.div>
            </div>

            <h4 className="text-lg font-heading font-semibold text-foreground mb-2">
              {device.name}
            </h4>

            <div className="flex items-center justify-between">
              <span className={`text-sm font-semibold uppercase ${
                device.status ? 'text-electric-teal' : 'text-foreground/40'
              }`}>
                {device.status ? 'Active' : 'Inactive'}
              </span>
              {device.type === 'light' && device.status && (
                <span className="text-sm text-foreground/60">{device.value}%</span>
              )}
              {device.type === 'thermostat' && device.status && (
                <span className="text-sm text-foreground/60">{device.value}°F</span>
              )}
            </div>

            {/* Progress bar for lights */}
            {device.type === 'light' && device.status && (
              <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${device.value}%` }}
                  className="h-full bg-electric-teal"
                />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {data?.description && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-sm text-foreground/60 italic"
        >
          {data.description}
        </motion.div>
      )}
    </div>
  );
}
