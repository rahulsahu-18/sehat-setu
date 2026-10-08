import { FormEvent, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Mic,
  ShieldCheck,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import api from "@/services/api";
import { FormMessage } from "@/components/AuthShell";
import { AppHeader } from "@/components/AppHeader";
import { getPatientCopy } from "@/lib/i18n";

type ChatMessage = { role: "user" | "assistant"; content: string };
type CareTeamGuidance = { guidance: string; createdAt: string };
type PatientReferralNote = {
  caseNo: string;
  patientName: string;
  referringFacility: string;
  referringFacilityLocation: string;
  receivingFacility: string;
  clinicalQuestion: string;
  patientInstructions: string;
  patientSharedAt: string;
};
type IntakeSummary = {
  summary: string;
  missingInformation: string[];
  contradictions?: string[];
  timeline?: { when: string; event: string; source: string }[];
  urgencySignals: { signal: string; confidence?: string; source?: string }[];
  deterministicSafetyFlags?: {
    ruleId: string;
    status: string;
    reason: string;
    instruction: string;
  }[];
  complete: boolean;
  conversation: ChatMessage[];
};

function PatientIntakePage() {
  const navigate = useNavigate();
  const { caseId } = useParams();
  const [activeCase, setActiveCase] = useState<{
    id: string;
    caseNo: string;
    status: string;
    priority: string;
    intakeLanguage: string;
  } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [summary, setSummary] = useState<IntakeSummary | null>(null);
  const [careTeamGuidance, setCareTeamGuidance] = useState<
    CareTeamGuidance[]
  >([]);
  const [referralNote, setReferralNote] =
    useState<PatientReferralNote | null>(null);
  const [content, setContent] = useState("");
  const [inputMode, setInputMode] = useState<"TEXT" | "VOICE">("TEXT");
  const [reportFile, setReportFile] = useState<File | null>(null);
  const reportInputRef = useRef<HTMLInputElement>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [voiceConsentAccepted, setVoiceConsentAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [speakingMessage, setSpeakingMessage] = useState<number | null>(null);
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const discardRecordingRef = useRef(false);
  const voiceRequestRef = useRef<AbortController | null>(null);
  const copy = getPatientCopy(
    activeCase?.intakeLanguage === "hindi"
      ? "hi"
      : activeCase?.intakeLanguage === "odia"
        ? "or"
        : "en",
  );
  const canSendMessage = [
    "NEW",
    "AI_PROCESSING",
    "WAITING_FOR_PATIENT",
  ].includes(activeCase?.status || "");

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(
      () => setRecordingSeconds((seconds) => seconds + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    if (recordingSeconds >= 60 && mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, [recordingSeconds]);

  useEffect(
    () => () => {
      const recorder = mediaRecorderRef.current;
      voiceRequestRef.current?.abort();
      voiceRequestRef.current = null;
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        if (recorder.state !== "inactive") recorder.stop();
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      speechUtteranceRef.current = null;
      window.speechSynthesis?.cancel();
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    setLoadingHistory(true);
    setMessages([]);
    setSummary(null);
    setCareTeamGuidance([]);
    setReferralNote(null);
    setContent("");
    setInputMode("TEXT");
    setActiveCase(null);
    setConsentAccepted(false);
    setVoiceConsentAccepted(false);
    setError("");
    speechUtteranceRef.current = null;
    window.speechSynthesis?.cancel();
    setSpeakingMessage(null);
    discardRecordingRef.current = true;
    voiceRequestRef.current?.abort();
    voiceRequestRef.current = null;
    setTranscribing(false);
    const recorder = mediaRecorderRef.current;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      if (recorder.state !== "inactive") recorder.stop();
      mediaRecorderRef.current = null;
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    setRecording(false);
    setRecordingSeconds(0);
    if (!caseId) {
      setLoadingHistory(false);
      return () => {
        cancelled = true;
      };
    }
    api
      .get(`/patient/intake/${caseId}/chat`)
      .then((response) => {
        if (cancelled) return;
        setActiveCase(response.data.data.case);
        setConsentAccepted(Boolean(response.data.data.case.consentAccepted));
        const data = response.data.data;
        setCareTeamGuidance(
          Array.isArray(data.careTeamGuidance) ? data.careTeamGuidance : [],
        );
        setReferralNote(data.referralNote || null);
        const savedSummary = data.summary as IntakeSummary | null;
        if (savedSummary) setSummary(savedSummary);
        setMessages(buildConversation(data));
      })
      .catch((requestError: any) => {
        if (cancelled) return;
        setActiveCase(null);
        setError(
          requestError.response?.data?.message ||
            "Unable to load your intake conversation.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const submitIntake = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!caseId) {
      setError("Choose a care case before submitting an intake.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await api.post(`/patient/intake/${caseId}/input`, {
        content,
        mode: inputMode,
      });
      const data = response.data.data;
      setActiveCase((current) =>
        current
          ? {
              ...current,
              status: data.status,
              priority: data.priority || current.priority,
            }
          : current,
      );
      const assistantReply = data.staffReviewPending
        ? `${data.reply || "Your care team is reviewing your intake."}\n\nYour care team is reviewing AI-suggested follow-up questions.`
        : data.reply;
      const nextMessages = [
        ...messages,
        { role: "user" as const, content: content.trim() },
        { role: "assistant" as const, content: assistantReply },
      ];
      setMessages(nextMessages);
      setSummary({
        summary: data.summary,
        missingInformation: data.missingInformation,
        contradictions: data.contradictions,
        timeline: data.timeline,
        urgencySignals: data.urgencySignals,
        deterministicSafetyFlags: data.deterministicSafetyFlags,
        complete: data.complete,
        conversation: nextMessages,
      });
      setContent("");
      setInputMode("TEXT");
    } catch (requestError: any) {
      setError(
        requestError.response?.data?.message || "Unable to submit your intake.",
      );
    } finally {
      setLoading(false);
    }
  };

  const startVoiceRecording = async () => {
    setError("");
    if (!voiceConsentAccepted) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError(copy.voiceUnsupported);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const preferredMimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);
      discardRecordingRef.current = false;
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        setRecording(false);
        if (discardRecordingRef.current) {
          audioChunksRef.current = [];
          return;
        }
        if (!audioChunksRef.current.length || !caseId) return;
        const audio = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        audioChunksRef.current = [];
        if (audio.size > 10 * 1024 * 1024) {
          setError(copy.voiceTooLarge);
          return;
        }
        const extension = audio.type.includes("mp4") ? "mp4" : "webm";
        const formData = new FormData();
        formData.append("audio", audio, `intake.${extension}`);
        const controller = new AbortController();
        voiceRequestRef.current = controller;
        setTranscribing(true);
        try {
          const response = await api.post(
            `/patient/intake/${caseId}/voice`,
            formData,
            { signal: controller.signal },
          );
          const transcript = response.data.data.transcript as string;
          if (!transcript?.trim()) {
            setError(copy.voiceNoSpeech);
            return;
          }
          setContent((current) =>
            current.trim()
              ? `${current.trim()}\n${transcript.trim()}`
              : transcript.trim(),
          );
          setInputMode("VOICE");
        } catch (requestError: any) {
          if (!controller.signal.aborted) {
            setError(
              requestError.response?.data?.message || copy.voiceFailed,
            );
          }
        } finally {
          if (voiceRequestRef.current === controller) {
            voiceRequestRef.current = null;
            setTranscribing(false);
          }
        }
      };
      mediaRecorderRef.current = recorder;
      setRecordingSeconds(0);
      recorder.start(250);
      setRecording(true);
    } catch (recordingError) {
      const permissionDenied =
        recordingError instanceof DOMException &&
        recordingError.name === "NotAllowedError";
      setError(permissionDenied ? copy.voicePermission : copy.voiceFailed);
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const toggleSpokenReply = (message: string, index: number) => {
    if (!("speechSynthesis" in window)) {
      setError(copy.voicePlaybackUnsupported);
      return;
    }
    if (speakingMessage === index) {
      speechUtteranceRef.current = null;
      window.speechSynthesis.cancel();
      setSpeakingMessage(null);
      return;
    }
    speechUtteranceRef.current = null;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    const voiceLanguage =
      activeCase?.intakeLanguage === "hindi"
        ? "hi-IN"
        : activeCase?.intakeLanguage === "odia"
          ? "or-IN"
          : "en-IN";
    utterance.lang = voiceLanguage;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice =
      voices.find((voice) => voice.lang.toLowerCase() === voiceLanguage.toLowerCase()) ||
      voices.find((voice) =>
        voice.lang.toLowerCase().startsWith(voiceLanguage.slice(0, 2)),
      ) ||
      null;
    utterance.onend = () => {
      if (speechUtteranceRef.current === utterance) {
        speechUtteranceRef.current = null;
        setSpeakingMessage(null);
      }
    };
    utterance.onerror = () => {
      if (speechUtteranceRef.current === utterance) {
        speechUtteranceRef.current = null;
        setSpeakingMessage(null);
        setError(copy.voicePlaybackUnsupported);
      }
    };
    speechUtteranceRef.current = utterance;
    setSpeakingMessage(index);
    window.speechSynthesis.speak(utterance);
  };

  const uploadReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!caseId || !reportFile) return;
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("report", reportFile);
      const response = await api.post(
        `/patient/intake/${caseId}/reports`,
        formData,
      );
      const data = response.data.data;
      setActiveCase((current) =>
        current
          ? {
              ...current,
              status: data.status,
              priority: data.priority || current.priority,
            }
          : current,
      );
      const savedSummary = data.summary as IntakeSummary;
      setSummary(savedSummary);
      setMessages(buildConversation({ summary: savedSummary }));
      setReportFile(null);
      if (reportInputRef.current) reportInputRef.current.value = "";
    } catch (requestError: any) {
      setError(
        requestError.response?.data?.message || "Unable to process this report.",
      );
    } finally {
      setLoading(false);
    }
  };

  const acceptConsent = async () => {
    if (!caseId) return;
    setLoading(true);
    setError("");
    try {
      await api.post(`/patient/intake/${caseId}/consent`, { consent: true });
      setConsentAccepted(true);
    } catch (requestError: any) {
      setError(
        requestError.response?.data?.message || "Unable to save consent.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!caseId) return <Navigate to="/patient/setup" replace />;

  return (
    <main className="care-setup-page">
      <AppHeader />
      <div className="intake-page-inner">
        <button
          className="intake-back"
          onClick={() => navigate("/patient/setup")}
        >
          <ArrowLeft size={15} /> Change care setup
        </button>
        <section className="intake-heading">
          <span className="auth-eyebrow">
            <span className="eyebrow-dot" /> AI INTAKE /{" "}
            {activeCase?.caseNo || "LOADING CASE"}
          </span>
          <h1>{copy.intakeTitle}</h1>
          <p>
            {copy.intakeBody} Selected language:{" "}
            <strong>{activeCase?.intakeLanguage || "English"}</strong>.
          </p>
        </section>
        {activeCase?.priority === "URGENT" && (
          <section
            className="patient-priority-guidance patient-priority-urgent"
            role="alert"
          >
            <AlertTriangle size={18} />
            <div>
              <strong>{copy.urgentReviewTitle}</strong>
              <p>{copy.urgentReviewBody}</p>
            </div>
          </section>
        )}
        {activeCase?.priority === "PRIORITY" && (
          <section className="patient-priority-guidance" role="status">
            <AlertTriangle size={18} />
            <div>
              <strong>{copy.priorityReviewTitle}</strong>
              <p>{copy.priorityReviewBody}</p>
            </div>
          </section>
        )}
        {!!careTeamGuidance.length && (
          <section
            className="patient-guidance-panel"
            aria-labelledby="patient-guidance-title"
          >
            <span className="section-label">MESSAGE FROM YOUR CARE TEAM</span>
            <h2 id="patient-guidance-title">{copy.guidanceTitle}</h2>
            {careTeamGuidance.map((item, index) => (
              <article key={`${item.createdAt}-${index}`}>
                <p>{item.guidance}</p>
                <time>{new Date(item.createdAt).toLocaleString()}</time>
              </article>
            ))}
          </section>
        )}
        {referralNote && (
          <section
            className="patient-guidance-panel patient-referral-slip"
            aria-labelledby="patient-referral-title"
          >
            <span className="section-label">REFERRAL HANDOFF</span>
            <h2 id="patient-referral-title">Referral slip from your care team</h2>
            <dl>
              <div>
                <dt>Patient / case</dt>
                <dd>
                  {referralNote.patientName} · {referralNote.caseNo}
                </dd>
              </div>
              <div>
                <dt>Referring facility</dt>
                <dd>
                  {referralNote.referringFacility}
                  {referralNote.referringFacilityLocation
                    ? ` · ${referralNote.referringFacilityLocation}`
                    : ""}
                </dd>
              </div>
              <div>
                <dt>Receiving facility / unit</dt>
                <dd>{referralNote.receivingFacility}</dd>
              </div>
              <div>
                <dt>Clinical question / reason for referral</dt>
                <dd>{referralNote.clinicalQuestion}</dd>
              </div>
              <div>
                <dt>Next steps from your clinician</dt>
                <dd>{referralNote.patientInstructions}</dd>
              </div>
            </dl>
            <p>
              This patient slip was explicitly shared by your care team. It is
              not an appointment confirmation. Contact the receiving facility
              to confirm availability and any arrangements.
            </p>
            <button
              className="button button-secondary patient-referral-print-button"
              type="button"
              onClick={() => window.print()}
            >
              Print / save referral information
            </button>
          </section>
        )}
        {activeCase?.status === "COMPLETED" && !careTeamGuidance.length && (
          <section
            className="patient-guidance-missing"
            role="status"
            aria-labelledby="patient-guidance-missing-title"
          >
            <h2 id="patient-guidance-missing-title">{copy.noGuidanceTitle}</h2>
            <p>{copy.noGuidanceBody}</p>
          </section>
        )}
        <div className="intake-layout">
          <section className="intake-card intake-chat-card">
            {!consentAccepted && !loadingHistory && (
              <div className="intake-consent-prompt" role="note">
                <strong>{copy.consentTitle}</strong>
                <p>{copy.consentBody}</p>
                <button
                  className="button button-primary"
                  type="button"
                  onClick={acceptConsent}
                  disabled={loading}
                >
                  {copy.agreeContinue}
                </button>
              </div>
            )}
            <div className="intake-chat-topline">
              <span>{copy.intakeMode}</span>
              {summary?.complete && (
                <span className="intake-complete">
                  <CheckCircle2 size={14} /> Summary ready
                </span>
              )}
            </div>
            <div className="intake-messages" aria-live="polite">
              {!!summary?.deterministicSafetyFlags?.length && (
                <div className="intake-emergency-alert" role="alert">
                  <AlertTriangle size={18} />
                  <div>
                    <strong>{copy.emergencyWarning}</strong>
                    {summary.deterministicSafetyFlags.map((flag) => (
                      <p key={flag.ruleId}>{flag.reason}</p>
                    ))}
                    <p>{summary.deterministicSafetyFlags[0]?.instruction}</p>
                    <small>
                      This is a prototype warning, not a diagnosis. Follow the
                      facility emergency protocol.
                    </small>
                  </div>
                </div>
              )}
              {loadingHistory ? (
                <p className="intake-empty">{copy.loadingConversation}</p>
              ) : messages.length === 0 ? (
                <div className="intake-empty">
                  <span className="intake-assistant-mark">S</span>
                  <p>
                    {copy.intakeBody}
                  </p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <article
                    className={`intake-message intake-message-${message.role}`}
                    key={`${index}-${message.role}`}
                  >
                    <span>
                      {message.role === "assistant" ? "CARE ASSISTANT" : "YOU"}
                    </span>
                    <p>{message.content}</p>
                    {message.role === "assistant" && (
                      <button
                        className="intake-speak-button"
                        type="button"
                        aria-label={
                          speakingMessage === index
                            ? copy.stopReply
                            : copy.playReply
                        }
                        title={
                          speakingMessage === index
                            ? copy.stopReply
                            : copy.playReply
                        }
                        onClick={() =>
                          toggleSpokenReply(message.content, index)
                        }
                      >
                        {speakingMessage === index ? (
                          <VolumeX size={15} />
                        ) : (
                          <Volume2 size={15} />
                        )}
                      </button>
                    )}
                  </article>
                ))
              )}
              {loading && (
                <p className="intake-thinking">{copy.loadingFollowUp}</p>
              )}
            </div>
            <FormMessage error={error} success="" />
            {activeCase && !canSendMessage && (
              <p className="intake-paused-note" role="status">
                {copy.messagingPaused}
              </p>
            )}
            <form className="intake-compose" onSubmit={submitIntake}>
              <label className="sr-only" htmlFor="concern">
                Your message
              </label>
              <textarea
                id="concern"
                className="intake-textarea"
                value={content}
                onChange={(event) => {
                  setContent(event.target.value);
                  setInputMode("TEXT");
                }}
                placeholder={copy.messagePlaceholder}
                maxLength={4000}
                disabled={
                  loading ||
                  transcribing ||
                  recording ||
                  loadingHistory ||
                  !consentAccepted ||
                  !canSendMessage
                }
                rows={3}
              />
              <div className="intake-voice-tools">
                <label className="intake-voice-consent">
                  <input
                    type="checkbox"
                    checked={voiceConsentAccepted}
                    onChange={(event) =>
                      setVoiceConsentAccepted(event.target.checked)
                    }
                    disabled={recording || transcribing || !consentAccepted}
                  />
                  <span>{copy.voiceConsent}</span>
                </label>
                {recording ? (
                  <button
                    className="intake-voice-button intake-voice-recording"
                    type="button"
                    onClick={stopVoiceRecording}
                    aria-label={copy.voiceStop}
                  >
                    <Square size={15} fill="currentColor" />
                    <span>
                      {copy.voiceRecording} · 0:
                      {String(recordingSeconds).padStart(2, "0")}
                    </span>
                  </button>
                ) : (
                  <button
                    className="intake-voice-button"
                    type="button"
                    onClick={startVoiceRecording}
                    disabled={
                      loading ||
                      transcribing ||
                      !voiceConsentAccepted ||
                      loadingHistory ||
                      !consentAccepted ||
                      !canSendMessage
                    }
                  >
                    <Mic size={16} />
                    <span>{copy.voiceStart}</span>
                  </button>
                )}
                {transcribing && (
                  <span className="intake-voice-status" role="status">
                    {copy.voiceTranscribing}
                  </span>
                )}
                <p className="intake-voice-privacy">{copy.voicePrivacy}</p>
              </div>
              <div className="intake-compose-footer">
                <span>
                  <ShieldCheck size={14} /> Messages go to AI and are saved to
                  your case
                </span>
                <button
                  className="intake-send-button"
                  type="submit"
                  aria-label={copy.sendMessage}
                  disabled={
                    loading ||
                    transcribing ||
                    recording ||
                    loadingHistory ||
                    !canSendMessage ||
                    !content.trim()
                  }
                >
                  <ArrowUp size={17} />
                </button>
              </div>
            </form>
            <form className="intake-report-upload" onSubmit={uploadReport}>
              <label htmlFor="medicalReport">{copy.reportTitle}</label>
              <p>{copy.reportHelp}</p>
              <div>
                <input
                  ref={reportInputRef}
                  id="medicalReport"
                  type="file"
                  accept=".pdf,.txt,.csv,application/pdf,text/plain,text/csv"
                  onChange={(event) =>
                    setReportFile(event.target.files?.[0] || null)
                  }
                  disabled={
                    loading ||
                    loadingHistory ||
                    !consentAccepted ||
                    !canSendMessage
                  }
                />
                <button
                  className="button button-secondary"
                  type="submit"
                  disabled={
                    loading ||
                    loadingHistory ||
                    !consentAccepted ||
                    !canSendMessage ||
                    !reportFile
                  }
                >
                  {loading ? copy.extracting : copy.uploadReport}
                </button>
              </div>
            </form>
            <p className="intake-disclaimer">
              {copy.disclaimer}
            </p>
          </section>
          <aside className="intake-summary-panel">
            <div className="intake-summary-heading">
              <span>CARE TEAM BRIEF</span>
              {summary?.complete && <CheckCircle2 size={16} />}
            </div>
            <h2>{copy.summaryTitle}</h2>
            <p>
              {summary?.summary ||
                copy.summaryLoading}
            </p>
            {!!summary?.missingInformation?.length && (
              <div className="intake-missing">
                <strong>{copy.reviewQuestions}</strong>
                {summary.missingInformation.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            )}
            {!!summary?.contradictions?.length && (
              <div className="intake-missing">
                <strong>{copy.contradictions}</strong>
                {summary.contradictions.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            )}
            {!!summary?.timeline?.length && (
              <div className="intake-timeline">
                <strong>{copy.timeline}</strong>
                {summary.timeline.map((item, index) => (
                  <article key={`${item.when}-${index}`}>
                    <span>{item.when}</span>
                    <p>{item.event}</p>
                    <small>Source: {item.source}</small>
                  </article>
                ))}
              </div>
            )}
            {!!summary?.urgencySignals?.length && (
              <div className="intake-urgency">
                <strong>
                  <AlertTriangle size={14} /> {copy.urgencySignals}
                </strong>
                {summary.urgencySignals.map((item, index) => (
                  <span key={`${item.signal}-${index}`}>{item.signal}</span>
                ))}
              </div>
            )}
            <div className="intake-summary-foot">
              AI-generated · For care-team review
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function buildConversation(data: {
  summary?: IntakeSummary | null;
  inputs?: { content: string }[];
  questions?: { status: string; question: string }[];
}): ChatMessage[] {
  const conversation: ChatMessage[] = Array.isArray(data.summary?.conversation)
    ? data.summary.conversation
    : (data.inputs || []).map((input) => ({
        role: "user" as const,
        content: input.content,
      }));
  const seenQuestions = new Set(
    conversation
      .filter((message) => message.role === "assistant")
      .map((message) => normalizeQuestion(message.content)),
  );
  const outstandingQuestions = (data.questions || [])
    .filter((item) => item.status === "SENT")
    .filter((item) => {
      const normalized = normalizeQuestion(item.question);
      if (seenQuestions.has(normalized)) return false;
      seenQuestions.add(normalized);
      return true;
    })
    .map((item) => ({
      role: "assistant" as const,
      content: item.question,
    }));
  return [...conversation, ...outstandingQuestions];
}

function normalizeQuestion(value: string) {
  return value
    .toLowerCase()
    .replace(/[?.!,،؟]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default PatientIntakePage;
