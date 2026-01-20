import { Link } from 'react-router-dom';
import { Waves } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Header() {
  return (
    <header className="w-full border-b border-white/10 bg-glassmorphism-overlay backdrop-blur-xl fixed top-0 left-0 z-50">
      <div className="w-full max-w-[120rem] mx-auto px-8 py-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
              className="w-10 h-10 rounded-lg bg-electric-teal flex items-center justify-center shadow-[0_0_20px_rgba(0,255,255,0.4)]"
            >
              <Waves className="w-6 h-6 text-deep-space-blue" />
            </motion.div>
            <div>
              <h1 className="text-xl font-heading font-bold text-electric-teal">
                VoiceCommand
              </h1>
              <p className="text-xs text-foreground/60">Neural Interface</p>
            </div>
          </Link>

          <nav className="flex items-center gap-8">
            <Link 
              to="https://yashag.dev" 
              className="text-sm font-paragraph text-foreground/80 hover:text-electric-teal transition-colors duration-300"
            >
              Yash's Portfolio
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
