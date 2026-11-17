import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Square, Volume2 } from "lucide-react";
import { speechGenerationUrl } from "@/lib/deployment";

type SpeechStatus = "idle" | "loading" | "playing" | "paused";

type SpeechControlsProps = {
  text: string;
  label: string;
  disabled?: boolean;
};

const STOP_EVENT = "palavra-viva:speech-stop";
const ELEVENLABS_VOICE = "elevenlabs:CstacWqMhJQlnfLPxRG4";

export default function SpeechControls({
  text,
  label,
  disabled = false,
}: SpeechControlsProps) {
  const controlId = useId();
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState("");
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const browserSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;
  const portugueseVoices = useMemo(
    () =>
      voices.filter(voice => voice.lang.toLocaleLowerCase().startsWith("pt")),
    [voices]
  );
  const otherVoices = useMemo(
    () =>
      voices.filter(voice => !voice.lang.toLocaleLowerCase().startsWith("pt")),
    [voices]
  );
  const orderedVoices = useMemo(
    () => [...portugueseVoices, ...otherVoices],
    [otherVoices, portugueseVoices]
  );
  const canSpeak =
    Boolean(text.trim()) &&
    !disabled &&
    (voiceName === ELEVENLABS_VOICE || browserSupported);

  function releaseRemoteAudio() {
    const audio = audioRef.current;
    audioRef.current = null;
    if (audio) {
      audio.onplay = null;
      audio.onpause = null;
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }

  function stop() {
    requestIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    releaseRemoteAudio();
    if (browserSupported) window.speechSynthesis.cancel();
    setStatus("idle");
    setError("");
  }

  useEffect(() => {
    const loadVoices = () => {
      if (!browserSupported) return;
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
      const preferred =
        available.find(voice => voice.lang.toLocaleLowerCase() === "pt-br") ??
        available.find(voice =>
          voice.lang.toLocaleLowerCase().startsWith("pt")
        );
      if (preferred) setVoiceName(current => current || preferred.name);
    };
    if (browserSupported) {
      loadVoices();
      window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    }

    const stopOtherSpeech = (event: Event) => {
      const source = (event as CustomEvent<{ source?: string }>).detail?.source;
      if (source === controlId) return;
      if (browserSupported) window.speechSynthesis.cancel();
      requestIdRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
      releaseRemoteAudio();
      setStatus("idle");
      setError("");
    };
    window.addEventListener(STOP_EVENT, stopOtherSpeech);

    return () => {
      if (browserSupported) {
        window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
        window.speechSynthesis.cancel();
      }
      window.removeEventListener(STOP_EVENT, stopOtherSpeech);
      requestIdRef.current += 1;
      abortRef.current?.abort();
      releaseRemoteAudio();
    };
  }, [browserSupported, controlId]);

  async function playElevenLabs() {
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    setError("");
    setStatus("loading");

    try {
      const response = await fetch(speechGenerationUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
        signal: controller.signal,
      });
      if (!response.ok) {
        if (requestId === requestIdRef.current) {
          const failure =
            response.status === 429
              ? ((await response.json().catch(() => null)) as {
                  error?: string;
                } | null)
              : null;
          setError(
            failure?.error === "daily_limit_reached"
              ? "O limite diário de áudio do site foi atingido. Tente novamente amanhã."
              : response.status === 429
                ? "Limite momentâneo de reproduções atingido. Aguarde e tente novamente."
                : "Não foi possível gerar o áudio agora. Tente novamente mais tarde."
          );
          setStatus("idle");
        }
        return;
      }

      const audioBlob = await response.blob();
      if (requestId !== requestIdRef.current) return;
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onplay = () => setStatus("playing");
      audio.onpause = () => {
        if (audioRef.current === audio && !audio.ended) setStatus("paused");
      };
      audio.onended = () => {
        if (audioRef.current === audio) {
          releaseRemoteAudio();
          setStatus("idle");
        }
      };
      audio.onerror = () => {
        if (audioRef.current === audio) {
          releaseRemoteAudio();
          setError("O áudio não pôde ser reproduzido neste navegador.");
          setStatus("idle");
        }
      };
      await audio.play();
    } catch (cause) {
      const aborted =
        cause instanceof DOMException && cause.name === "AbortError";
      if (!aborted && requestId === requestIdRef.current) {
        releaseRemoteAudio();
        setError(
          "Não foi possível gerar ou reproduzir o áudio. Tente novamente."
        );
        setStatus("idle");
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  function play() {
    if (!canSpeak) return;
    window.dispatchEvent(
      new CustomEvent(STOP_EVENT, { detail: { source: controlId } })
    );
    setError("");
    if (voiceName === ELEVENLABS_VOICE) {
      void playElevenLabs();
      return;
    }
    if (!browserSupported) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoice =
      voices.find(voice => voice.name === voiceName) ?? portugueseVoices[0];
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
  }

  function pause() {
    if (voiceName === ELEVENLABS_VOICE) {
      audioRef.current?.pause();
    } else if (browserSupported && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setStatus("paused");
    }
  }

  function resume() {
    if (voiceName === ELEVENLABS_VOICE) {
      void audioRef.current
        ?.play()
        .then(() => setStatus("playing"))
        .catch(() => {
          setError(
            "O áudio não pôde ser continuado. Pressione Play para tentar novamente."
          );
          setStatus("idle");
        });
    } else if (browserSupported && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setStatus("playing");
    }
  }

  return (
    <div className="speech-controls" aria-label={`Ouvir ${label}`}>
      <span className="speech-controls-label">
        <Volume2 size={14} /> Ouvir {label}
      </span>
      <div className="speech-controls-buttons">
        {status === "paused" ? (
          <button
            type="button"
            onClick={resume}
            disabled={!canSpeak}
            aria-label={`Continuar ${label}`}
            title="Continuar"
          >
            <RotateCcw size={14} /> Continuar
          </button>
        ) : (
          <button
            type="button"
            onClick={play}
            disabled={!canSpeak || status === "playing" || status === "loading"}
            aria-label={`Reproduzir ${label}`}
            title="Reproduzir"
          >
            <Play size={14} /> {status === "loading" ? "Preparando…" : "Play"}
          </button>
        )}
        <button
          type="button"
          onClick={pause}
          disabled={status !== "playing"}
          aria-label={`Pausar ${label}`}
          title="Pausar"
        >
          <Pause size={14} /> Pausar
        </button>
        <button
          type="button"
          onClick={stop}
          disabled={status === "idle"}
          aria-label={`Parar ${label}`}
          title="Parar"
        >
          <Square size={13} /> Parar
        </button>
      </div>
      <label className="speech-voice-select">
        Voz disponível
        <select
          value={voiceName}
          onChange={event => {
            stop();
            setVoiceName(event.target.value);
          }}
          disabled={disabled}
          aria-label={`Selecionar voz para ${label}`}
        >
          <option value="">Voz padrão do navegador (pt-BR)</option>
          <option value={ELEVENLABS_VOICE}>
            ElevenLabs · voz personalizada
          </option>
          {orderedVoices.map(voice => (
            <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
              {voice.name} ({voice.lang})
              {voice.lang.toLocaleLowerCase().startsWith("pt")
                ? " · português"
                : ""}
            </option>
          ))}
        </select>
      </label>
      {voiceName === ELEVENLABS_VOICE && (
        <span className="speech-voice-note">
          Usa créditos da conta; o limite diário é compartilhado no site.
        </span>
      )}
      {error && (
        <span className="speech-error" role="alert">
          {error}
        </span>
      )}
      {status === "loading" && (
        <span className="sr-only" role="status">
          Gerando áudio…
        </span>
      )}
    </div>
  );
}
