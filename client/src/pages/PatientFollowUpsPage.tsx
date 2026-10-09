import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Mic, MicOff, RefreshCw, Send, ShieldAlert, Volume2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createLocalAudioTrack, Room, RoomEvent, Track } from "livekit-client";
import api from "@/services/api";
import { AppHeader } from "@/components/AppHeader";

type FollowUp = {
  id: string;
  caseId: string;
  caseNo: string;
  language: string;
  question: string;
  source: string;
  status: "SENT" | "IN_PROGRESS" | "ANSWERED" | "REVIEWED" | string;
  createdAt: string;
  answer?: { answer: string; mode: "TEXT" | "VOICE"; createdAt: string } | null;
};

type VoiceTranscriptEvent = {
  type: "sehatsetu.followup.transcript";
  transcript: string;
  language?: string;
};

function PatientFollowUpsPage() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<FollowUp[]>([]);
  const [followUp, setFollowUp] = useState<FollowUp | null>(null);
  const [answer, setAnswer] = useState("");
  const [mode, setMode] = useState<"TEXT" | "VOICE">("TEXT");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [voiceState, setVoiceState] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [error, setError] = useState("");
  const roomRef = useRef<Room | null>(null);
  const microphoneRef = useRef<Awaited<ReturnType<typeof createLocalAudioTrack>> | null>(null);
  const idempotencyStorageKey = questionId ? `sehatsetu:followup-idempotency:${questionId}` : "";
  const audioContainerRef = useRef<HTMLDivElement | null>(null);
  const idempotencyRef = useRef<{ payload: string; key: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    if (questionId) {
      api.get(`/patient/follow-ups/${questionId}`)
        .then((response) => {
          if (cancelled) return;
          const data = response.data.data as FollowUp;
          setFollowUp(data);
          setAnswer(data.answer?.answer || "");
          setMode(data.answer?.mode || "TEXT");
        })
        .catch((requestError: any) => {
          if (!cancelled) setError(requestError.response?.data?.message || "Unable to load this follow-up.");
        })
        .finally(() => { if (!cancelled) setLoading(false); });
    } else {
      api.get("/patient/follow-ups")
        .then((response) => { if (!cancelled) setItems(response.data.data as FollowUp[]); })
        .catch((requestError: any) => {
          if (!cancelled) setError(requestError.response?.data?.message || "Unable to load follow-ups.");
        })
        .finally(() => { if (!cancelled) setLoading(false); });
    }
    return () => { cancelled = true; };
  }, [questionId]);

  const stopVoice = async () => {
    const room = roomRef.current;
    roomRef.current = null;
    try { microphoneRef.current?.stop(); } catch { /* best-effort cleanup */ }
    microphoneRef.current = null;
    if (room) {
      room.removeAllListeners();
      await room.disconnect();
    }
    if (audioContainerRef.current) audioContainerRef.current.replaceChildren();
    setVoiceState("idle");
  };

  useEffect(() => () => {
    const room = roomRef.current;
    roomRef.current = null;
    microphoneRef.current?.stop();
    if (room) void room.disconnect();
  }, []);

  const startVoice = async () => {
    if (!followUp || !["SENT", "IN_PROGRESS"].includes(followUp.status)) return;
    setError("");
    setVoiceState("connecting");
    try {
      const response = await api.post(`/patient/follow-ups/${followUp.id}/voice-token`, {});
      const { url, token } = response.data.data as { url: string; token: string };
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind !== Track.Kind.Audio || !audioContainerRef.current) return;
        const element = track.attach();
        element.autoplay = true;
        audioContainerRef.current.appendChild(element);
      });
      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((element) => element.remove());
      });
      room.on(RoomEvent.DataReceived, (payload, _participant, _kind, topic) => {
        if (topic !== "sehatsetu-followup-transcript") return;
        try {
          const data = JSON.parse(new TextDecoder().decode(payload)) as VoiceTranscriptEvent;
          if (data.type !== "sehatsetu.followup.transcript" || typeof data.transcript !== "string") return;
          const transcript = data.transcript.trim();
          if (!transcript) return;
          setAnswer((current) => current ? `${current.trim()} ${transcript}` : transcript);
          setMode("VOICE");
          idempotencyRef.current = null;
          if (idempotencyStorageKey) window.sessionStorage.removeItem(idempotencyStorageKey);
        } catch {
          setError("A voice transcript could not be read. You can type your answer instead.");
        }
      });
      room.on(RoomEvent.Disconnected, () => {
        setVoiceState((current) => current === "connecting" || current === "connected" ? "idle" : current);
      });

      await room.connect(url, token);
      await room.startAudio();
      const microphone = await createLocalAudioTrack();
      microphoneRef.current = microphone;
      await room.localParticipant.publishTrack(microphone, { source: Track.Source.Microphone });
      setVoiceState("connected");
    } catch (voiceError: any) {
      await stopVoice();
      setVoiceState("error");
      setError(voiceError.response?.data?.message || voiceError.message || "LiveKit voice is unavailable. Please answer using text.");
    }
  };

  const submitAnswer = async () => {
    if (!followUp || saving) return;
    const normalized = answer.trim();
    if (!normalized) {
      setError("Please enter or record an answer before submitting.");
      return;
    }
    if (normalized.length > 4000) {
      setError("Please keep your answer under 4,000 characters.");
      return;
    }
    if (!["SENT", "IN_PROGRESS"].includes(followUp.status)) return;
    setSaving(true);
    setError("");
    await stopVoice();
    try {
      const payloadIdentity = JSON.stringify({ answer: normalized, mode });
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payloadIdentity));
      const payloadHash = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
      let savedKey: { key: string; payloadHash: string } | null = null;
      try {
        const saved = idempotencyStorageKey ? window.sessionStorage.getItem(idempotencyStorageKey) : null;
        savedKey = saved ? JSON.parse(saved) as { key: string; payloadHash: string } : null;
      } catch {
        savedKey = null;
      }
      const key = savedKey?.payloadHash === payloadHash
        ? savedKey.key
        : crypto.randomUUID();
      idempotencyRef.current = { payload: payloadIdentity, key };
      // Store only a random key and a one-way answer fingerprint. Do not persist
      // patient answer text in browser storage; this survives refresh/retry.
      if (idempotencyStorageKey) {
        window.sessionStorage.setItem(idempotencyStorageKey, JSON.stringify({ key, payloadHash }));
      }
      const response = await api.post(
        `/patient/follow-ups/${followUp.id}/answer`,
        { answer: normalized, mode },
        { headers: { "Idempotency-Key": key } },
      );
      const data = response.data.data;
      setFollowUp((current) => current ? {
        ...current,
        status: data.status,
        answer: { answer: data.answer, mode: data.mode, createdAt: data.createdAt },
      } : current);
      setItems((current) => current.map((item) => item.id === followUp.id
        ? { ...item, status: data.status, answer: { answer: data.answer, mode: data.mode, createdAt: data.createdAt } }
        : item));
      setAnswer(data.answer);
      setMode(data.mode);
      if (idempotencyStorageKey) window.sessionStorage.removeItem(idempotencyStorageKey);
      idempotencyRef.current = null;
      setError("");
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || "Unable to save the answer. Retry the same answer to safely resume.");
    } finally {
      setSaving(false);
    }
  };

  const pendingStatuses = ["SENT", "IN_PROGRESS"];
  const pending = items.filter((item) => pendingStatuses.includes(item.status));
  const history = items.filter((item) => !pendingStatuses.includes(item.status));

  return (
    <main style={{ minHeight: "100vh", background: "#f6f9fa", color: "#17313a" }}>
      <AppHeader />
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "28px 18px 64px" }}>
        <Link to="/patient/cases" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#087e8b", textDecoration: "none", marginBottom: 18 }}>
          <ArrowLeft size={17} /> Back to my cases
        </Link>
        <header style={{ marginBottom: 22 }}>
          <p style={{ color: "#087e8b", fontSize: 12, fontWeight: 800, letterSpacing: 1.1, margin: "0 0 8px" }}>PATIENT WORKSPACE</p>
          <h1 style={{ fontSize: 30, lineHeight: 1.2, margin: "0 0 8px" }}>{questionId ? "Answer a care-team follow-up" : "Care-team follow-ups"}</h1>
          <p style={{ color: "#557079", lineHeight: 1.6, margin: 0 }}>Respond to each question separately. Your answer is sent to the care team for review, not used to diagnose or prescribe.</p>
        </header>

        <aside style={{ display: "flex", gap: 12, padding: 16, border: "1px solid #f0d6a8", borderRadius: 14, background: "#fffaf0", marginBottom: 20 }}>
          <ShieldAlert size={21} color="#9a5c00" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, lineHeight: 1.5, color: "#6e4c18" }}>SehatSetu is not an emergency service. If you may be experiencing a life-threatening emergency, seek immediate local emergency care instead of waiting for an app response.</p>
        </aside>

        {error && (
          <div role="alert" style={{ border: "1px solid #e3aaaa", borderRadius: 12, background: "#fff4f4", color: "#8e2828", padding: 12, marginBottom: 18 }}>
            {error}
          </div>
        )}

        {loading ? (
          <p role="status">Loading follow-ups…</p>
        ) : questionId ? (
          followUp ? (
            <section style={{ background: "#fff", border: "1px solid #dce7ea", borderRadius: 18, padding: 22, boxShadow: "0 10px 28px #15343b0a" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#557079" }}>{followUp.caseNo}</span>
                <span style={{ fontSize: 12, borderRadius: 999, padding: "5px 9px", background: followUp.status === "REVIEWED" ? "#e5f6ee" : followUp.status === "ANSWERED" ? "#e8f0ff" : "#fff0d6", color: "#37545c", fontWeight: 700 }}>{followUp.status.replaceAll("_", " ")}</span>
              </div>
              <h2 style={{ fontSize: 18, margin: "0 0 10px" }}>Original question from your care team</h2>
              <blockquote style={{ margin: 0, padding: 16, borderLeft: "4px solid #0f8995", background: "#f2f9fa", borderRadius: "0 12px 12px 0", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{followUp.question}</blockquote>
              {followUp.answer ? (
                <div style={{ marginTop: 20 }}>
                  <h3 style={{ display: "flex", gap: 8, alignItems: "center" }}><CheckCircle2 size={18} color="#167c57" /> Your submitted answer</h3>
                  <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.65 }}>{followUp.answer.answer}</p>
                  <p style={{ fontSize: 12, color: "#647d84" }}>Submitted using {followUp.answer.mode.toLowerCase()} · {new Date(followUp.answer.createdAt).toLocaleString()}</p>
                </div>
              ) : (
                <>
                  <div style={{ marginTop: 22 }}>
                    <label htmlFor="followup-answer" style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>Your answer</label>
                    <textarea
                      id="followup-answer"
                      value={answer}
                      onChange={(event) => {
                        setAnswer(event.target.value);
                        setMode("TEXT");
                        idempotencyRef.current = null;
                        if (idempotencyStorageKey) window.sessionStorage.removeItem(idempotencyStorageKey);
                      }}
                      rows={5}
                      maxLength={4000}
                      placeholder="Type your answer here, or use the microphone to speak…"
                      style={{ boxSizing: "border-box", width: "100%", resize: "vertical", padding: 13, border: "1px solid #bacbd0", borderRadius: 12, font: "inherit", lineHeight: 1.6 }}
                    />
                    <p style={{ textAlign: "right", fontSize: 12, color: "#617780" }}>{answer.length}/4000</p>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    {voiceState === "connected" ? (
                      <button type="button" onClick={() => void stopVoice()} style={buttonStyle("#fff0d6", "#805300")}><MicOff size={16} /> Stop voice</button>
                    ) : (
                      <button type="button" onClick={() => void startVoice()} disabled={voiceState === "connecting"} style={buttonStyle("#e4f4f6", "#086e7a")}>
                        {voiceState === "connecting" ? <RefreshCw size={16} /> : <Mic size={16} />}
                        {voiceState === "connecting" ? "Connecting…" : "Answer with voice"}
                      </button>
                    )}
                    <button type="button" onClick={() => void submitAnswer()} disabled={saving || !answer.trim() || voiceState === "connected"} style={buttonStyle("#087e8b", "#fff")}>
                      <Send size={16} /> {saving ? "Saving answer…" : "Review and submit answer"}
                    </button>
                    <span style={{ color: "#657e84", fontSize: 12 }}>{voiceState === "connected" ? "Speak naturally; stop voice to review the transcript." : "Voice needs LiveKit credentials. Text always remains available."}</span>
                  </div>
                  <div ref={audioContainerRef} aria-label="Voice agent audio output" />
                </>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 24, borderTop: "1px solid #edf2f3", paddingTop: 18 }}>
                <button type="button" onClick={() => navigate("/patient/follow-ups")} style={buttonStyle("#f2f6f7", "#34525a")}><ArrowLeft size={16} /> All follow-ups</button>
                <span style={{ fontSize: 12, color: "#6e858b", alignSelf: "center" }}>A saved answer cannot be edited; request a new question if a correction is needed.</span>
              </div>
            </section>
          ) : <p>Follow-up not found or not assigned to your account.</p>
        ) : (
          <>
            <section style={{ marginBottom: 26 }}>
              <h2 style={{ fontSize: 18 }}>Waiting for your answer <span style={{ color: "#667f86", fontSize: 14 }}>({pending.length})</span></h2>
              {pending.length ? pending.map((item) => (
                <Link key={item.id} to={`/patient/follow-ups/${item.id}`} style={listItemStyle}>
                  <span style={{ flex: 1 }}>
                    <strong style={{ display: "block", color: "#17313a", marginBottom: 6 }}>{item.question}</strong>
                    <small style={{ color: "#617980" }}>{item.caseNo} · {new Date(item.createdAt).toLocaleString()}</small>
                  </span>
                  <span style={{ color: "#087e8b", fontWeight: 700, whiteSpace: "nowrap" }}>Answer <Volume2 size={15} style={{ verticalAlign: "middle" }} /></span>
                </Link>
              )) : <p style={{ color: "#617980" }}>You have no pending follow-up questions.</p>}
            </section>
            {!!history.length && (
              <section>
                <h2 style={{ fontSize: 18 }}>Submitted answers</h2>
                {history.map((item) => (
                  <Link key={item.id} to={`/patient/follow-ups/${item.id}`} style={listItemStyle}>
                    <span style={{ flex: 1 }}>
                      <strong style={{ display: "block", color: "#17313a", marginBottom: 6 }}>{item.question}</strong>
                      <small style={{ color: "#617980" }}>{item.caseNo} · {item.status.replaceAll("_", " ")}</small>
                    </span>
                    <CheckCircle2 size={18} color="#168260" />
                  </Link>
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

const buttonStyle = (background: string, color: string) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  background,
  color,
  border: "1px solid transparent",
  borderRadius: 10,
  padding: "10px 14px",
  font: "inherit",
  fontWeight: 700,
  cursor: "pointer",
  opacity: 1,
} as const);

const listItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  background: "#fff",
  border: "1px solid #dce7ea",
  borderRadius: 14,
  padding: 16,
  marginBottom: 10,
  textDecoration: "none",
  lineHeight: 1.45,
} as const;

export default PatientFollowUpsPage;
