import { useEffect, useRef, useState } from "react";
import { Play, Pause, Square, Gauge } from "lucide-react";

interface Props {
  text: string;
  onPlay?: () => void;
}

const RATES = [0.75, 1, 1.25, 1.5, 2];

const LessonAudioPlayer = ({ text, onPlay }: Props) => {
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState(1);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const start = () => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    u.pitch = 1;
    u.onend = () => { setPlaying(false); setPaused(false); };
    u.onerror = () => { setPlaying(false); setPaused(false); };
    utteranceRef.current = u;
    window.speechSynthesis.speak(u);
    setPlaying(true);
    setPaused(false);
    onPlay?.();
  };

  const handlePlayPause = () => {
    if (!playing) { start(); return; }
    if (paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    } else {
      window.speechSynthesis.pause();
      setPaused(true);
    }
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setPlaying(false);
    setPaused(false);
  };

  const cycleRate = () => {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    setRate(next);
    if (playing) {
      // restart at new rate
      start();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handlePlayPause}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm bg-accent text-accent-foreground hover:opacity-90 transition active:scale-[0.97]"
      >
        {playing && !paused ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        {playing && !paused ? "Pause" : paused ? "Resume" : "Listen"}
      </button>
      {playing && (
        <button
          onClick={handleStop}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition"
        >
          <Square className="w-4 h-4" /> Stop
        </button>
      )}
      <button
        onClick={cycleRate}
        title="Playback speed"
        className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition"
      >
        <Gauge className="w-4 h-4" /> {rate}x
      </button>
    </div>
  );
};

export default LessonAudioPlayer;
