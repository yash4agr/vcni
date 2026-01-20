import { motion } from 'framer-motion';
import { Cloud, CloudRain, Sun, Wind, Droplets, Eye } from 'lucide-react';
import { Image } from '@/components/ui/image';
import type { ActionWidgets } from '@/entities';

interface WeatherWidgetProps {
  data?: ActionWidgets;
}

export default function WeatherWidget({ data }: WeatherWidgetProps) {
  // Parse configuration if available
  const config = data?.configurationJson ? JSON.parse(data.configurationJson) : null;
  
  const weatherData = config || {
    temperature: 72,
    condition: 'Partly Cloudy',
    humidity: 65,
    windSpeed: 12,
    visibility: 10,
    forecast: [
      { day: 'Mon', high: 75, low: 62, icon: 'sun' },
      { day: 'Tue', high: 73, low: 60, icon: 'cloud' },
      { day: 'Wed', high: 68, low: 58, icon: 'rain' },
      { day: 'Thu', high: 70, low: 59, icon: 'cloud' },
    ]
  };

  const getWeatherIcon = (icon: string) => {
    switch (icon) {
      case 'sun':
        return <Sun className="w-8 h-8 text-electric-teal" />;
      case 'rain':
        return <CloudRain className="w-8 h-8 text-electric-teal" />;
      default:
        return <Cloud className="w-8 h-8 text-electric-teal" />;
    }
  };

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Main Weather Display */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-deep-space-blue/40 rounded-2xl p-8 border border-electric-teal/20 relative overflow-hidden"
      >
        {/* Background Glow Effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-electric-teal/5 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <Cloud className="w-16 h-16 text-electric-teal" />
              <div>
                <h3 className="text-5xl font-heading font-bold text-foreground">
                  {weatherData.temperature}°F
                </h3>
                <p className="text-lg text-foreground/70 mt-1">{weatherData.condition}</p>
              </div>
            </div>
            
            {data?.visualAsset && (
              <div className="mt-6">
                <Image 
                  src={data.visualAsset} 
                  alt="Weather visualization"
                  className="w-full h-32 object-cover rounded-xl opacity-60"
                  width={400}
                />
              </div>
            )}
          </div>

          {/* Weather Stats */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 bg-glassmorphism-overlay backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <Droplets className="w-6 h-6 text-electric-teal" />
              <div>
                <p className="text-xs text-foreground/60">Humidity</p>
                <p className="text-lg font-semibold text-foreground">{weatherData.humidity}%</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-glassmorphism-overlay backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <Wind className="w-6 h-6 text-electric-teal" />
              <div>
                <p className="text-xs text-foreground/60">Wind Speed</p>
                <p className="text-lg font-semibold text-foreground">{weatherData.windSpeed} mph</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-glassmorphism-overlay backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <Eye className="w-6 h-6 text-electric-teal" />
              <div>
                <p className="text-xs text-foreground/60">Visibility</p>
                <p className="text-lg font-semibold text-foreground">{weatherData.visibility} mi</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Forecast */}
      {weatherData.forecast && weatherData.forecast.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h4 className="text-sm font-heading font-semibold text-foreground/70 uppercase tracking-wider mb-4">
            5-Day Forecast
          </h4>
          <div className="grid grid-cols-4 gap-4">
            {weatherData.forecast.map((day: any, index: number) => (
              <motion.div
                key={day.day}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                className="bg-deep-space-blue/30 rounded-xl p-4 border border-white/5 hover:border-electric-teal/30 transition-all duration-300 text-center"
              >
                <p className="text-sm font-semibold text-foreground mb-3">{day.day}</p>
                <div className="flex justify-center mb-3">
                  {getWeatherIcon(day.icon)}
                </div>
                <div className="flex items-center justify-center gap-2 text-xs">
                  <span className="text-foreground">{day.high}°</span>
                  <span className="text-foreground/40">{day.low}°</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {data?.description && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-foreground/60 italic"
        >
          {data.description}
        </motion.div>
      )}
    </div>
  );
}
