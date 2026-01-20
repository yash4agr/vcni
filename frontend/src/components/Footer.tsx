import { Cpu, Radio, Zap } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-glassmorphism-overlay backdrop-blur-xl mt-16">
      <div className="w-full max-w-[120rem] mx-auto px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand Section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-electric-teal/20 flex items-center justify-center border border-electric-teal/30">
                <Radio className="w-5 h-5 text-electric-teal" />
              </div>
              <h3 className="text-lg font-heading font-semibold text-electric-teal">
                VoiceCommand
              </h3>
            </div>
            <p className="text-sm text-foreground/60 leading-relaxed">
              Next-generation voice interface powered by neural processing and real-time intent detection.
            </p>
          </div>

          {/* Features */}
          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-heading font-semibold text-foreground uppercase tracking-wider">
              Core Systems
            </h4>
            <ul className="flex flex-col gap-3">
              <li className="flex items-center gap-2 text-sm text-foreground/70">
                <Cpu className="w-4 h-4 text-electric-teal" />
                <span>Real-time Processing</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-foreground/70">
                <Zap className="w-4 h-4 text-electric-teal" />
                <span>Intent Detection</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-foreground/70">
                <Radio className="w-4 h-4 text-electric-teal" />
                <span>Dynamic Widgets</span>
              </li>
            </ul>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-heading font-semibold text-foreground uppercase tracking-wider">
              System Status
            </h4>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-electric-teal shadow-[0_0_10px_rgba(0,255,255,0.6)] animate-pulse" />
                <span className="text-sm text-foreground/70">All Systems Operational</span>
              </div>
              <div className="text-xs text-foreground/50 font-paragraph">
                Latency: &lt;50ms | Uptime: 99.9%
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-foreground/50 font-paragraph">
            © 2026 VoiceCommand Neural Interface. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-foreground/50 hover:text-electric-teal transition-colors duration-300">
              Privacy
            </a>
            <a href="#" className="text-xs text-foreground/50 hover:text-electric-teal transition-colors duration-300">
              Terms
            </a>
            <a href="#" className="text-xs text-foreground/50 hover:text-electric-teal transition-colors duration-300">
              Documentation
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
