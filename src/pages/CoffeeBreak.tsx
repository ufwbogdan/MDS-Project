import { WifiOff, Coffee } from "lucide-react";
import deerLogo from "@/assets/deer-logo.png";

const CoffeeBreak = () => {
  return (
    <div className="min-h-screen coffee-gradient flex items-center justify-center p-4">
      <div className="text-center max-w-md animate-scale-in">
        <img src={deerLogo} alt="Buckle Down" className="w-24 h-24 mx-auto mb-6 opacity-60" />
        <div className="flex items-center justify-center gap-2 mb-4">
          <Coffee className="w-6 h-6 text-coffee-light" />
          <h1 className="text-2xl font-bold text-primary" style={{ lineHeight: "1.15" }}>
            Coffee Break
          </h1>
        </div>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          Looks like you've lost your internet connection. Take a breather — your cached study materials are still available below.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-8">
          <WifiOff className="w-4 h-4" />
          <span>No connection detected</span>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="coffee-btn-outline"
        >
          Try Again
        </button>
      </div>
    </div>
  );
};

export default CoffeeBreak;
