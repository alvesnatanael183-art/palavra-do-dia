import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, Square, Volume2 } from "lucide-react";

type SpeechStatus = "idle" | "playing" | "paused";

type SpeechControlsProps = {
  text: string;
  label: string;
  disabled?: boolean;
};

const STOP_EVENT = "palavra-viva:speech-stop";

export default function SpeechControls({ text, label, disabled = false }: SpeechControlsProps) {
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState("");

  const portugueseVoices = useMemo(
    () => voices.filter(voice => voice.lang.toLocaleLowerCase().startsWith("pt")),
    [voices]
  );

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
      const preferred = available.find(voice => voice.lang.toLocaleLowerCase() === "pt-br")
        ?? available.find(voice => voice.lang.toLocaleLowerCase().startsWith("pt"));
      if (preferred) setVoiceName(current => current || preferred.name);
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    const stopOtherSpeech = () => setStatus("idle");
    window.addEventListener(STOP_EVENT, stopOtherSpeech);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      window.removeEventListener(STOP_EVENT, stopOtherSpeech);
    };
  }, []);

  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const canSpeak = supported && Boolean(text.trim()) && !disabled;

  const stop = () => {
    if (supported) window.speechSynthesis.cancel();
    setStatus("idle");
  };

  const play = () => {
    if (!canSpeak) return;
    window.dispatchEvent(new Event(STOP_EVENT));
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoice = voices.find(voice => voice.name === voiceName)
      ?? portugueseVoices[0];
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      utterance.lang = "pt-BR";
    }
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onstart = () => setStatus("playing");
    utterance.onend = () => setStatus("idle");
    utterance.onerror = () => setStatus("idle");
    window.speechSynthesis.speak(utterance);
  };

  const pause = () => {
    if (supported && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setStatus("paused");
    }
  };

  const resume = () => {
    if (supported && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setStatus("playing");
    }
  };

  if (!supported) return null;

  return (
    <div className="speech-controls" aria-label={`Ouvir ${label}`}>
      <span className="speech-controls-label"><Volume2 size={14} /> Ouvir {label}</span>
      <div className="speech-controls-buttons">
        {status === "paused" ? (
          <button type="button" onClick={resume} disabled={!canSpeak} aria-label={`Continuar ${label}`} title="Continuar"><RotateCcw size={14} /> Continuar</button>
        ) : (
          <button type="button" onClick={play} disabled={!canSpeak || status === "playing"} aria-label={`Reproduzir ${label}`} title="Reproduzir"><Play size={14} /> Play</button>
        )}
        <button type="button" onClick={pause} disabled={status !== "playing"} aria-label={`Pausar ${label}`} title="Pausar"><Pause size={14} /> Pausar</button>
        <button type="button" onClick={stop} disabled={status === "idle"} aria-label={`Parar ${label}`} title="Parar"><Square size={13} /> Parar</button>
      </div>
      <label className="speech-voice-select">Voz
        <select value={voiceName} onChange={event => setVoiceName(event.target.value)} disabled={!voices.length} aria-label={`Selecionar voz para ${label}`}>
          {portugueseVoices.length ? portugueseVoices.map(voice => <option key={`${voice.name}-${voice.lang}`} value={voice.name}>{voice.name} ({voice.lang})</option>) : <option value="">Voz padrão do navegador</option>}
        </select>
      </label>
    </div>
  );
}
