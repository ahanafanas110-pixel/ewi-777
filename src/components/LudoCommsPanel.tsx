import React, { useEffect, useRef, useState } from 'react';
import { LudoPlayer, LudoRoomMessage, LudoVoicePeer, LudoVoiceSignal } from '../types';
import {
  saveLudoVoicePeerToFirebase,
  sendLudoRoomMessageToFirebase,
  sendLudoVoiceSignalToFirebase,
  subscribeLudoRoomMessagesInFirebase,
  subscribeLudoVoicePeersInFirebase,
  subscribeLudoVoiceSignalsInFirebase
} from '../lib/firebase';
import {
  Headphones,
  MessageCircle,
  Mic,
  MicOff,
  Play,
  Radio,
  Send,
  Square,
  Volume2,
  VolumeX
} from 'lucide-react';

const QUICK_PHRASES = [
  'খেলা হবে! 🔥',
  '৬ দাও বস 🎲',
  'দারুণ চাল! 👏',
  'বাঁচলাম 😅',
  'কাটবো কিন্তু! 💥',
  'ভালো খেলছো 🤝'
];

const COLOR_BADGE: Record<LudoPlayer['color'], string> = {
  red: 'bg-rose-500 text-white',
  green: 'bg-emerald-500 text-white',
  yellow: 'bg-cyan-600 text-white',
  blue: 'bg-blue-600 text-white'
};

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export interface OnlineChatItem {
  id: string;
  senderId: string;
  senderName: string;
  senderColor?: LudoPlayer['color'];
  text: string;
  createdAtMs: number;
}

interface LudoCommsPanelProps {
  mode: 'friends' | 'online';
  roomId?: string;
  userId: string;
  userName: string;
  userColor?: LudoPlayer['color'];
  players: LudoPlayer[];
  soundEnabled: boolean;
  onRemoteVoicePeersChange?: (activeUserIds: Set<string>) => void;
  onIncomingBubble?: (senderId: string, text: string) => void;
  onPlayChatPop?: () => void;
  onlineMessages?: OnlineChatItem[];
  onSendOnlineMessage?: (text: string) => void;
  onShowToast?: (msg: string) => void;
}

export const LudoCommsPanel: React.FC<LudoCommsPanelProps> = ({
  mode,
  roomId,
  userId,
  userName,
  userColor,
  players,
  soundEnabled,
  onRemoteVoicePeersChange,
  onIncomingBubble,
  onPlayChatPop,
  onlineMessages = [],
  onSendOnlineMessage,
  onShowToast
}) => {
  const [textDraft, setTextDraft] = useState('');
  const [roomMessages, setRoomMessages] = useState<LudoRoomMessage[]>([]);
  const [voicePeers, setVoicePeers] = useState<LudoVoicePeer[]>([]);
  const [micActive, setMicActive] = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [isRecordingClip, setIsRecordingClip] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Array<{ peerId: string; stream: MediaStream }>>([]);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const seenSignalIdsRef = useRef<Set<string>>(new Set());
  const seenMsgIdsRef = useRef<Set<string>>(new Set());
  const sessionStartRef = useRef<number>(Date.now());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const recordStartMsRef = useRef<number>(0);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const speakerEnabledRef = useRef(speakerEnabled);
  speakerEnabledRef.current = speakerEnabled;
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;
  const micActiveRef = useRef(micActive);
  micActiveRef.current = micActive;

  // Scroll chat smoothly to bottom on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [roomMessages.length, onlineMessages.length]);

  const playVoiceDataUrl = (msgId: string, dataUrl?: string) => {
    if (!dataUrl) return;
    try {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      const audio = new Audio(dataUrl);
      audioPlayerRef.current = audio;
      setPlayingMsgId(msgId);
      audio.onended = () => setPlayingMsgId((cur) => (cur === msgId ? null : cur));
      audio.onerror = () => setPlayingMsgId((cur) => (cur === msgId ? null : cur));
      audio.play().catch(() => {
        setPlayingMsgId(null);
      });
    } catch {
      setPlayingMsgId(null);
    }
  };

  // Subscribe room messages in Friends mode
  useEffect(() => {
    if (mode !== 'friends' || !roomId) return;
    sessionStartRef.current = Date.now();
    seenMsgIdsRef.current.clear();

    const unsub = subscribeLudoRoomMessagesInFirebase(roomId, (msgs) => {
      setRoomMessages(msgs);
      msgs.forEach((m) => {
        if (seenMsgIdsRef.current.has(m.id)) return;
        seenMsgIdsRef.current.add(m.id);
        if (m.createdAtMs < sessionStartRef.current - 2500) return;
        if (m.senderId !== userId) {
          if (m.type === 'voice') {
            onIncomingBubble?.(m.senderId, `🎤 Voice (${m.audioDurationSec || 2}s)`);
            if (speakerEnabledRef.current && soundEnabledRef.current && m.audioData) {
              playVoiceDataUrl(m.id, m.audioData);
            }
          } else if (m.text) {
            onIncomingBubble?.(m.senderId, m.text);
            onPlayChatPop?.();
          }
        }
      });
    });

    return () => {
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, roomId, userId]);

  // Create or get RTCPeerConnection for a peer
  const getOrCreatePeerConnection = (remoteUserId: string): RTCPeerConnection => {
    const existing = peerConnsRef.current.get(remoteUserId);
    if (existing && existing.connectionState !== 'closed' && existing.connectionState !== 'failed') {
      return existing;
    }
    if (existing) {
      try {
        existing.close();
      } catch {}
    }
    const pc = new RTCPeerConnection(ICE_SERVERS);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, localStreamRef.current!);
        } catch {}
      });
    }

    pc.onicecandidate = (ev) => {
      if (ev.candidate && roomId) {
        const sig: LudoVoiceSignal = {
          id: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          roomId,
          fromUserId: userId,
          toUserId: remoteUserId,
          kind: 'ice',
          payload: JSON.stringify(ev.candidate.toJSON()),
          createdAtMs: Date.now()
        };
        sendLudoVoiceSignalToFirebase(roomId, sig).catch(() => {});
      }
    };

    pc.ontrack = (ev) => {
      const stream = ev.streams?.[0];
      if (!stream) return;
      setRemoteStreams((prev) => {
        const filtered = prev.filter((item) => item.peerId !== remoteUserId);
        return [...filtered, { peerId: remoteUserId, stream }];
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed' || pc.connectionState === 'disconnected') {
        setRemoteStreams((prev) => prev.filter((item) => item.peerId !== remoteUserId));
      }
    };

    peerConnsRef.current.set(remoteUserId, pc);
    return pc;
  };

  // Subscribe voicePeers + voiceSignals for Live WebRTC Mic in Friends mode
  useEffect(() => {
    if (mode !== 'friends' || !roomId || !userId) return;

    // Register presence as listener so others can push audio if their mic is live
    saveLudoVoicePeerToFirebase(roomId, {
      id: userId,
      roomId,
      userId,
      name: userName,
      color: userColor,
      micActive: micActiveRef.current,
      updatedAt: Date.now()
    }).catch(() => {});

    const unsubPeers = subscribeLudoVoicePeersInFirebase(roomId, (peers) => {
      setVoicePeers(peers);
      const activeSet = new Set(peers.filter((p) => p.micActive).map((p) => p.userId));
      onRemoteVoicePeersChange?.(activeSet);

      // Initiate offers toward other peers if we have an active mic and smaller ID (or they joined freshly)
      if (micActiveRef.current && localStreamRef.current) {
        peers.forEach(async (p) => {
          if (!p.userId || p.userId === userId) return;
          if (userId < p.userId || !p.micActive) {
            const cur = peerConnsRef.current.get(p.userId);
            if (!cur || cur.signalingState === 'closed') {
              try {
                const pc = getOrCreatePeerConnection(p.userId);
                if (pc.signalingState === 'stable') {
                  const offer = await pc.createOffer({ offerToReceiveAudio: true });
                  await pc.setLocalDescription(offer);
                  await sendLudoVoiceSignalToFirebase(roomId, {
                    id: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                    roomId,
                    fromUserId: userId,
                    toUserId: p.userId,
                    kind: 'offer',
                    payload: JSON.stringify(offer),
                    createdAtMs: Date.now()
                  });
                }
              } catch {}
            }
          }
        });
      }
    });

    const unsubSignals = subscribeLudoVoiceSignalsInFirebase(roomId, async (signals) => {
      for (const sig of signals) {
        if (seenSignalIdsRef.current.has(sig.id)) continue;
        seenSignalIdsRef.current.add(sig.id);
        if (sig.createdAtMs < sessionStartRef.current - 5000) continue;
        if (sig.toUserId !== userId || sig.fromUserId === userId) continue;

        try {
          const pc = getOrCreatePeerConnection(sig.fromUserId);
          const parsed = JSON.parse(sig.payload);

          if (sig.kind === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(parsed));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendLudoVoiceSignalToFirebase(roomId, {
              id: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              roomId,
              fromUserId: userId,
              toUserId: sig.fromUserId,
              kind: 'answer',
              payload: JSON.stringify(answer),
              createdAtMs: Date.now()
            });
          } else if (sig.kind === 'answer') {
            if (pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(parsed));
            }
          } else if (sig.kind === 'ice') {
            if (parsed) {
              await pc.addIceCandidate(new RTCIceCandidate(parsed)).catch(() => {});
            }
          }
        } catch {}
      }
    });

    return () => {
      unsubPeers();
      unsubSignals();
      peerConnsRef.current.forEach((pc) => {
        try {
          pc.close();
        } catch {}
      });
      peerConnsRef.current.clear();
      setRemoteStreams([]);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      saveLudoVoicePeerToFirebase(roomId, {
        id: userId,
        roomId,
        userId,
        name: userName,
        color: userColor,
        micActive: false,
        updatedAt: Date.now()
      }).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, roomId, userId]);

  const toggleLiveMic = async () => {
    if (mode !== 'friends' || !roomId) return;
    if (micActive) {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      peerConnsRef.current.forEach((pc) => {
        try {
          pc.close();
        } catch {}
      });
      peerConnsRef.current.clear();
      setMicActive(false);
      await saveLudoVoicePeerToFirebase(roomId, {
        id: userId,
        roomId,
        userId,
        name: userName,
        color: userColor,
        micActive: false,
        updatedAt: Date.now()
      }).catch(() => {});
      onShowToast?.('Microphone muted');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      onShowToast?.('Mic live call unavailable in this browser — use Voice Note or Text Chat!');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      localStreamRef.current = stream;
      setMicActive(true);
      await saveLudoVoicePeerToFirebase(roomId, {
        id: userId,
        roomId,
        userId,
        name: userName,
        color: userColor,
        micActive: true,
        updatedAt: Date.now()
      }).catch(() => {});

      // Renegotiate / initiate offers to all peers in room
      for (const peer of voicePeers) {
        if (!peer.userId || peer.userId === userId) continue;
        try {
          const existing = peerConnsRef.current.get(peer.userId);
          if (existing) existing.close();
          peerConnsRef.current.delete(peer.userId);
          const pc = getOrCreatePeerConnection(peer.userId);
          const offer = await pc.createOffer({ offerToReceiveAudio: true });
          await pc.setLocalDescription(offer);
          await sendLudoVoiceSignalToFirebase(roomId, {
            id: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            roomId,
            fromUserId: userId,
            toUserId: peer.userId,
            kind: 'offer',
            payload: JSON.stringify(offer),
            createdAtMs: Date.now()
          });
        } catch {}
      }
      onShowToast?.('Live Mic ON — friends can hear you now!');
    } catch {
      onShowToast?.('Please allow microphone permission to talk live!');
    }
  };

  // Push-to-talk short Voice Note recording (always works via Firestore even across restrictive NAT)
  const stopAndSendVoiceClip = () => {
    if (recordTimerRef.current) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    setIsRecordingClip(false);
    setRecordingSec(0);
  };

  const startVoiceClipRecording = async () => {
    if (mode !== 'friends' || !roomId) return;
    if (isRecordingClip) {
      stopAndSendVoiceClip();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      onShowToast?.('Voice recording not supported on this browser');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 16000 })
        : new MediaRecorder(stream);

      recordChunksRef.current = [];
      recordStartMsRef.current = Date.now();
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          recordChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const durationSec = Math.max(1, Math.min(8, Math.round((Date.now() - recordStartMsRef.current) / 1000)));
        const blob = new Blob(recordChunksRef.current, { type: mimeType || 'audio/webm' });
        if (blob.size < 300) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
          const dataUrl = typeof reader.result === 'string' ? reader.result : '';
          if (!dataUrl || dataUrl.length > 135000) {
            onShowToast?.('Voice clip too long — keep under 6 seconds');
            return;
          }
          const msg: LudoRoomMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            roomId,
            senderId: userId,
            senderName: userName,
            senderColor: userColor,
            type: 'voice',
            text: `Voice message (${durationSec}s)`,
            audioData: dataUrl,
            audioDurationSec: durationSec,
            createdAtMs: Date.now()
          };
          onIncomingBubble?.(userId, `🎤 Voice (${durationSec}s)`);
          await sendLudoRoomMessageToFirebase(roomId, msg);
        };
        reader.readAsDataURL(blob);
      };

      recorder.start(200);
      setIsRecordingClip(true);
      setRecordingSec(1);
      recordTimerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordStartMsRef.current) / 1000) + 1;
        setRecordingSec(elapsed);
        if (elapsed >= 6) {
          stopAndSendVoiceClip();
        }
      }, 450);
    } catch {
      onShowToast?.('Allow microphone permission to send voice message!');
    }
  };

  const handleSendText = async (overrideText?: string, isQuick = false) => {
    const clean = (overrideText ?? textDraft).trim();
    if (!clean) return;
    if (!overrideText) setTextDraft('');

    if (mode === 'online') {
      onSendOnlineMessage?.(clean);
      return;
    }

    if (!roomId) return;
    const msg: LudoRoomMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      roomId,
      senderId: userId,
      senderName: userName,
      senderColor: userColor,
      type: isQuick ? 'quick' : 'text',
      text: clean.slice(0, 400),
      createdAtMs: Date.now()
    };
    onIncomingBubble?.(userId, clean);
    await sendLudoRoomMessageToFirebase(roomId, msg);
  };

  const displayMessages =
    mode === 'friends'
      ? roomMessages.slice(-20)
      : onlineMessages.slice(-20).map((m) => ({
          id: m.id,
          roomId: 'online',
          senderId: m.senderId,
          senderName: m.senderName,
          senderColor: m.senderColor,
          type: 'text' as const,
          text: m.text,
          createdAtMs: m.createdAtMs
        }));

  const liveSpeakers = voicePeers.filter((p) => p.micActive);

  return (
    <div className="bg-white border border-cyan-100 rounded-2xl p-3 shadow-xs space-y-2.5">
      {/* Hidden audio elements for live WebRTC peer streams */}
      {remoteStreams.map(({ peerId, stream }) => (
        <RemoteAudioStream key={peerId} stream={stream} muted={!speakerEnabled || !soundEnabled} />
      ))}

      {/* Voice Call & Table Comms Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <MessageCircle className="w-4 h-4 text-[#0891B2]" />
          <span className="text-xs font-black text-slate-900">
            {mode === 'friends' ? 'Live Voice & Table Chat' : 'Table Chat & Quick Messages'}
          </span>
          {mode === 'friends' && liveSpeakers.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black inline-flex items-center gap-1 animate-pulse">
              <Radio className="w-3 h-3" />
              <span>{liveSpeakers.length} Speaking</span>
            </span>
          )}
        </div>

        {mode === 'friends' && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleLiveMic}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black inline-flex items-center gap-1 border transition-all active:scale-95 ${
                micActive
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-cyan-50 hover:text-[#0891B2]'
              }`}
            >
              {micActive ? <Mic className="w-3.5 h-3.5 animate-pulse" /> : <MicOff className="w-3.5 h-3.5" />}
              <span>{micActive ? 'Mic ON' : 'Mic OFF'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSpeakerEnabled((s) => !s)}
              aria-label={speakerEnabled ? 'Mute voice audio' : 'Unmute voice audio'}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black inline-flex items-center gap-1 border transition-all ${
                speakerEnabled
                  ? 'bg-cyan-50 text-[#0891B2] border-cyan-200'
                  : 'bg-rose-50 text-rose-600 border-rose-200'
              }`}
            >
              {speakerEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{speakerEnabled ? 'Audio' : 'Muted'}</span>
            </button>

            <button
              type="button"
              onClick={startVoiceClipRecording}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black inline-flex items-center gap-1 border transition-all active:scale-95 ${
                isRecordingClip
                  ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                  : 'bg-cyan-50 text-[#0891B2] border-cyan-200 hover:bg-cyan-100'
              }`}
            >
              {isRecordingClip ? <Square className="w-3 h-3 fill-current" /> : <Headphones className="w-3.5 h-3.5" />}
              <span>{isRecordingClip ? `Send (${recordingSec}s)` : 'Voice Note'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Live Speakers Pill Row (Friends Room) */}
      {mode === 'friends' && liveSpeakers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {liveSpeakers.map((sp) => {
            const pColor = sp.color || players.find((p) => p.userId === sp.userId)?.color || 'red';
            return (
              <span
                key={sp.userId}
                className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold inline-flex items-center gap-1"
              >
                <span className={`w-2 h-2 rounded-full ${COLOR_BADGE[pColor].split(' ')[0]}`} />
                <span>{sp.name || 'Friend'}</span>
                <Mic className="w-2.5 h-2.5 text-emerald-600" />
              </span>
            );
          })}
        </div>
      )}

      {/* Quick Bengali & Ludo Chat Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {QUICK_PHRASES.map((phrase) => (
          <button
            key={phrase}
            type="button"
            onClick={() => handleSendText(phrase, true)}
            className="px-2.5 py-1 rounded-full bg-slate-50 hover:bg-cyan-50 border border-slate-200 hover:border-cyan-200 text-slate-700 hover:text-[#0891B2] text-[10px] font-bold whitespace-nowrap active:scale-95 transition-colors"
          >
            {phrase}
          </button>
        ))}
      </div>

      {/* Scrollable Chat History */}
      <div
        ref={chatScrollRef}
        className="max-h-32 overflow-y-auto space-y-1.5 bg-slate-50/80 border border-slate-100 rounded-xl p-2"
      >
        {displayMessages.length === 0 ? (
          <div className="text-[11px] text-slate-400 text-center py-2">
            {mode === 'friends'
              ? 'Tap Mic ON to talk live, send a Voice Note, or write a message!'
              : 'Send a quick message or tap a reaction above!'}
          </div>
        ) : (
          displayMessages.map((m) => {
            const isMine = m.senderId === userId;
            const badgeCls = COLOR_BADGE[m.senderColor || 'yellow'];
            return (
              <div key={m.id} className={`flex items-start gap-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-2.5 py-1.5 text-[11px] shadow-2xs border ${
                    isMine
                      ? 'bg-cyan-50 border-cyan-200 text-slate-900'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-black ${badgeCls}`}>
                      {isMine ? 'You' : m.senderName}
                    </span>
                  </div>
                  {m.type === 'voice' && m.audioData ? (
                    <button
                      type="button"
                      onClick={() => playVoiceDataUrl(m.id, m.audioData)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0891B2] text-white text-[10px] font-black mt-0.5 active:scale-95"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>
                        {playingMsgId === m.id ? 'Playing...' : `Voice Note (${m.audioDurationSec || 2}s)`}
                      </span>
                    </button>
                  ) : (
                    <div className="font-medium leading-snug break-words">{m.text}</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Text Message Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendText();
        }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          maxLength={240}
          value={textDraft}
          onChange={(e) => setTextDraft(e.target.value)}
          placeholder="মেসেজ লিখুন / Type message..."
          className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0891B2]"
        />
        <button
          type="submit"
          disabled={!textDraft.trim()}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#0891B2] to-[#0D9488] disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white text-xs font-black inline-flex items-center gap-1 active:scale-95"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};

const RemoteAudioStream: React.FC<{ stream: MediaStream; muted: boolean }> = ({ stream, muted }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.srcObject = stream;
      audioRef.current.play().catch(() => {});
    }
  }, [stream]);

  return <audio ref={audioRef} autoPlay playsInline muted={muted} className="hidden" />;
};
