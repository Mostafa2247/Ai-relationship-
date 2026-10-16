import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Send,
  Sparkles,
  Plus,
  Trash2,
  Copy,
  Check,
  FileText,
  AlertCircle,
  Brain,
  Calendar,
  Settings,
  MoreVertical,
  Heart,
  Users,
  MessageSquare,
  MessageCircle,
  X,
  RotateCcw,
  Paperclip,
  Film,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { FormattedMessage } from './FormattedMessage';
import { MediaComposerStrip, PendingMediaItem } from './MediaComposerStrip';
import { MediaMessageBubble } from './MediaMessageBubble';
import { MemoryManager } from './MemoryManager';
import { TimelineManager } from './TimelineManager';
import { ExportSettingsView } from './ExportSettingsView';
import { DetailedAnalysisModal } from './DetailedAnalysisModal';
import { ReplyGeneratorModal } from './ReplyGeneratorModal';
import { EditRelationshipModal } from './EditRelationshipModal';
import { ExitMemoryModal } from './ExitMemoryModal';
import { ConfirmModal } from './ConfirmModal';
import {
  getConversations,
  createConversation,
  getMessages,
  addMessage,
  deleteMessage,
  deleteConversation,
  getMemories,
  addMemory,
  updateMemory,
  deleteMemory,
  clearAllMemories,
  getTimelineEvents,
  addTimelineEvent,
  deleteTimelineEvent,
  updateRelationship,
} from '../services/relationshipService';
import type { Relationship, Conversation, Message, MemoryItem, TimelineEvent, MediaAttachment } from '../types';

interface RelationshipWorkspaceProps {
  userId: string;
  relationship: Relationship;
  onBack: () => void;
  onRelationshipUpdated: (updated: Relationship) => void;
  onRelationshipDeleted: () => void;
}

export const RelationshipWorkspace: React.FC<RelationshipWorkspaceProps> = ({
  userId,
  relationship,
  onBack,
  onRelationshipUpdated,
  onRelationshipDeleted,
}) => {
  const { uiLang, aiLang } = useTheme();
  const isAr = uiLang === 'ar';

  // Active view: 'chat' is the default full-page view. Other views open as dedicated sheets/modals so chat is never crammed.
  const [activeSheet, setActiveSheet] = useState<'none' | 'memory' | 'timeline' | 'settings'>('none');

  // Conversations & Messages
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Track failed turns so retry never loses user messages or attachments
  const [failedTurn, setFailedTurn] = useState<{
    stage: 'upload' | 'firestore' | 'ai_reply';
    userText: string;
    pendingMedia: PendingMediaItem[];
    userMsgId?: string;
  } | null>(null);

  // Media attachments state
  const [pendingMedia, setPendingMedia] = useState<PendingMediaItem[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentImages = pendingMedia.filter((m) => m.mediaType === 'image').length;
    const currentVideos = pendingMedia.filter((m) => m.mediaType === 'video').length;

    let newImagesCount = 0;
    let newVideosCount = 0;
    const newItems: PendingMediaItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|3gp|mkv|avi|m4v)$/i.test(file.name);
      const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|heic|heif|bmp)$/i.test(file.name);

      if (!isImage && !isVideo) {
        setErrorMsg(isAr ? `الملف "${file.name}" بصيغة غير مدعومة. ندعم الصور والفيديوهات الشائعة.` : `File "${file.name}" has an unsupported format.`);
        continue;
      }

      if (isImage) {
        if (currentImages + newImagesCount >= 10) {
          setErrorMsg(isAr ? 'الحد الأقصى للصور في الرسالة الواحدة هو 10 صور' : 'Maximum 10 images per message');
          break;
        }
        if (file.size > 25 * 1024 * 1024) {
          setErrorMsg(isAr ? `حجم الصورة "${file.name}" يتجاوز الحد المسموح (25 ميجابايت)` : `Image "${file.name}" exceeds 25MB limit`);
          continue;
        }
        newImagesCount++;
      } else if (isVideo) {
        if (currentVideos + newVideosCount >= 10) {
          setErrorMsg(isAr ? 'الحد الأقصى لمقاطع الفيديو في الرسالة الواحدة هو 10 مقاطع فيديو' : 'Maximum 10 videos per message');
          break;
        }
        if (file.size > 100 * 1024 * 1024) {
          setErrorMsg(isAr ? `حجم الفيديو "${file.name}" يتجاوز الحد المسموح (100 ميجابايت)` : `Video "${file.name}" exceeds 100MB limit`);
          continue;
        }
        newVideosCount++;
      }

      const previewUrl = URL.createObjectURL(file);
      const sizeFormatted = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

      newItems.push({
        id: 'pending_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6) + '_' + i,
        file,
        previewUrl,
        mediaType: isVideo ? 'video' : 'image',
        label: '',
        sizeFormatted,
      });
    }

    if (newItems.length > 0) {
      setPendingMedia((prev) => [...prev, ...newItems]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePendingMedia = (id: string) => {
    setPendingMedia((prev) => {
      const item = prev.find((m) => m.id === id);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((m) => m.id !== id);
    });
  };

  const handleUpdatePendingMediaLabel = (id: string, label: string) => {
    setPendingMedia((prev) =>
      prev.map((m) => (m.id === id ? { ...m, label } : m))
    );
  };

  // Memory & Timeline state
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);

  // Modals & Sheets
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [analysisInputText, setAnalysisInputText] = useState('');
  const [showReplyGenerator, setShowReplyGenerator] = useState(false);
  const [replyInputText, setReplyInputText] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSessionsDrawer, setShowSessionsDrawer] = useState(false);
  const [deleteConvId, setDeleteConvId] = useState<string | null>(null);
  const [showExitMemoryModal, setShowExitMemoryModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleRequestExit = () => {
    if (messages.length > 0) {
      setShowExitMemoryModal(true);
    } else {
      onBack();
    }
  };

  const handleSaveMemoriesAndExit = async (
    toSave: any[],
    newSummary?: string
  ) => {
    for (const m of toSave) {
      await handleAddMemory({
        content: m.content,
        category: m.category,
        classification: m.classification,
        confidence: m.confidence || 'moderate',
        sourceReference: m.sourceReference || 'مستخرج عند إنهاء الجلسة',
      });
    }
    if (newSummary) {
      await handleUpdateRelationship({ summary: newSummary });
    }
    setShowExitMemoryModal(false);
    onBack();
  };

  const handleSkipAndExit = () => {
    setShowExitMemoryModal(false);
    onBack();
  };

  // Load initial conversations, memories, timeline
  useEffect(() => {
    loadData();
  }, [relationship.id]);

  const loadData = async () => {
    try {
      const [convs, mems, times] = await Promise.all([
        getConversations(userId, relationship.id),
        getMemories(userId, relationship.id),
        getTimelineEvents(userId, relationship.id),
      ]);
      setConversations(convs);
      setMemories(mems);
      setTimelineEvents(times);

      if (convs.length > 0) {
        setActiveConv(convs[0]);
      } else {
        const newConv = await createConversation(
          userId,
          relationship.id,
          isAr ? 'جلسة تحليل جديدة' : 'New Analysis Session'
        );
        setConversations([newConv]);
        setActiveConv(newConv);
      }
    } catch (e) {
      console.error('Error loading relationship workspace data:', e);
    }
  };

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConv) {
      setMessages([]);
      return;
    }
    const fetchMsgs = async () => {
      try {
        const msgs = await getMessages(userId, relationship.id, activeConv.id);
        setMessages(msgs);
      } catch (err) {
        console.error('Error loading messages:', err);
      }
    };
    fetchMsgs();
  }, [activeConv?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleCreateNewConversation = async () => {
    try {
      const newConv = await createConversation(
        userId,
        relationship.id,
        isAr ? `محادثة ${conversations.length + 1}` : `Conversation ${conversations.length + 1}`
      );
      setConversations((prev) => [newConv, ...prev]);
      setActiveConv(newConv);
      setShowSessionsDrawer(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (retryText?: string, retryMedia?: PendingMediaItem[]) => {
    const userText = (retryText !== undefined ? retryText : inputMessage).trim();
    const mediaToUpload = retryMedia !== undefined ? [...retryMedia] : [...pendingMedia];

    if ((!userText && mediaToUpload.length === 0) || !activeConv || sending || uploadingMedia) return;

    if (retryText === undefined) {
      setInputMessage('');
      setPendingMedia([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
    setErrorMsg('');
    setSending(true);

    let uploadedAttachments: MediaAttachment[] = [];
    let userMsg: Message | null = null;

    try {
      // 1. Upload media attachments if any
      if (mediaToUpload.length > 0) {
        setUploadingMedia(true);
        const formData = new FormData();
        const labelsMap: Record<string, string> = {};

        mediaToUpload.forEach((item) => {
          formData.append('files', item.file);
          if (item.label) {
            labelsMap[item.file.name] = item.label;
          }
        });
        formData.append('userId', userId);
        formData.append('relationshipId', relationship.id);
        formData.append('labels', JSON.stringify(labelsMap));

        const uploadRes = await fetch('/api/upload-media', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.error || (isAr ? 'فشل رفع المرفقات، يرجى إعادة المحاولة' : 'Failed to upload attachments'));
        }

        const uploadData = await uploadRes.json();
        uploadedAttachments = uploadData.attachments || [];
        setUploadingMedia(false);

        // Clean up preview URLs
        mediaToUpload.forEach((m) => {
          try {
            URL.revokeObjectURL(m.previewUrl);
          } catch {}
        });
      }

      // 2. Save user message to Firestore
      const defaultPrompt = isAr
        ? 'يرجى مراجعة هذه المرفقات وتحليلها بعناية مع سياق العلاقة والمحادثة السابقة.'
        : 'Please analyze these attached media in the context of our relationship.';
      const finalContent = userText || (uploadedAttachments.length > 0 ? defaultPrompt : '');

      userMsg = await addMessage(userId, relationship.id, activeConv.id, {
        role: 'user',
        content: finalContent,
        attachments: uploadedAttachments,
      });
      setMessages((prev) => [...prev, userMsg!]);

      // 3. Request Gemini AI response with client-side retry for temporary spikes
      const conversationHistory = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
        attachments: m.attachments,
      }));

      let assistantText = '';
      let lastErrText = '';

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: conversationHistory,
              relationship,
              memories,
              preferredLanguage: aiLang,
            }),
          });

          if (response.ok) {
            const resData = await response.json();
            assistantText = resData.reply || '';
            break;
          } else {
            const data = await response.json().catch(() => ({}));
            lastErrText = data.error || (isAr ? 'خوادم الذكاء الاصطناعي تشهد ضغطاً مؤقتاً' : 'Server is busy');
            if (attempt < 2) await new Promise((r) => setTimeout(r, 1000));
          }
        } catch (fetchErr: any) {
          lastErrText = fetchErr?.message || (isAr ? 'خطأ في الاتصال بالخادم' : 'Network error');
          if (attempt < 2) await new Promise((r) => setTimeout(r, 1000));
        }
      }

      if (!assistantText) {
        throw new Error(lastErrText || (isAr ? 'تعذر الحصول على رد من الذكاء الاصطناعي حالياً' : 'Failed to get reply'));
      }

      // 4. Save assistant message to Firestore
      const assistantMsg = await addMessage(userId, relationship.id, activeConv.id, {
        role: 'assistant',
        content: assistantText,
      });
      setMessages((prev) => [...prev, assistantMsg]);
      setFailedTurn(null);
    } catch (err: any) {
      console.error('Chat error:', err);
      const rawMsg = String(err?.message || '');
      let cleanMsg = isAr ? 'تعذر إرسال الرسالة أو تلقي الرد، يرجى إعادة المحاولة' : 'Failed to send message, please retry';
      if (rawMsg.toLowerCase().includes('failed to fetch') || rawMsg.toLowerCase().includes('networkerror')) {
        cleanMsg = isAr ? 'تعذر الاتصال بالخادم، يرجى الضغط على زر "إعادة المحاولة".' : 'Network connection error, please tap Retry.';
      } else if (rawMsg.includes('503') || rawMsg.includes('high demand') || rawMsg.includes('UNAVAILABLE')) {
        cleanMsg = isAr ? 'خوادم الذكاء الاصطناعي تشهد ضغطاً مؤقتاً، اضغط على زر "إعادة المحاولة" للمحاولة مجدداً.' : 'AI servers are busy, please tap Retry.';
      } else if (rawMsg) {
        cleanMsg = rawMsg;
      }
      setErrorMsg(cleanMsg);

      if (!userMsg) {
        // Failed during upload or initial save
        setFailedTurn({
          stage: mediaToUpload.length > 0 ? 'upload' : 'firestore',
          userText,
          pendingMedia: mediaToUpload,
        });
      } else {
        // User message was saved, but AI generation timed out or had high demand
        setFailedTurn({
          stage: 'ai_reply',
          userText,
          pendingMedia: [],
          userMsgId: userMsg.id,
        });
      }
    } finally {
      setSending(false);
      setUploadingMedia(false);
    }
  };

  const handleRestoreDraft = () => {
    if (failedTurn?.userText) {
      setInputMessage(failedTurn.userText);
    }
    if (failedTurn?.pendingMedia && failedTurn.pendingMedia.length > 0) {
      setPendingMedia(failedTurn.pendingMedia);
    }
    setFailedTurn(null);
    setErrorMsg('');
  };

  const handleCopyMessage = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleDeleteMessage = async (messageId: string, attachments?: MediaAttachment[]) => {
    if (!activeConv) return;
    try {
      await deleteMessage(userId, relationship.id, activeConv.id, messageId, attachments);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      if (failedTurn?.userMsgId === messageId) {
        setFailedTurn(null);
      }
    } catch (err: any) {
      console.error('Failed to delete message:', err);
      setErrorMsg(isAr ? 'فشل حذف الرسالة' : 'Failed to delete message');
    }
  };

  const handleRetry = async (targetMsgId?: string) => {
    if (!activeConv || sending) return;

    // If an upload or initial send failed before user message was posted
    if (!targetMsgId && failedTurn && (failedTurn.stage === 'upload' || failedTurn.stage === 'firestore')) {
      return handleSendMessage(failedTurn.userText, failedTurn.pendingMedia);
    }

    let historyToReplay: any[] = [];
    let replacingMsgId: string | null = null;
    const effectiveTargetId = targetMsgId || failedTurn?.userMsgId;

    if (effectiveTargetId) {
      const idx = messages.findIndex((m) => m.id === effectiveTargetId);
      if (idx !== -1) {
        const target = messages[idx];
        if (target.role === 'assistant') {
          replacingMsgId = target.id;
          historyToReplay = messages.slice(0, idx).map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments,
          }));
        } else {
          historyToReplay = messages.slice(0, idx + 1).map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments,
          }));
        }
      }
    }

    if (historyToReplay.length === 0 && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'assistant') {
        replacingMsgId = lastMsg.id;
        historyToReplay = messages.slice(0, messages.length - 1).map((m) => ({
          role: m.role,
          content: m.content,
          attachments: m.attachments,
        }));
      } else {
        historyToReplay = messages.map((m) => ({
          role: m.role,
          content: m.content,
          attachments: m.attachments,
        }));
      }
    }

    if (historyToReplay.length === 0) {
      if (failedTurn?.userText) {
        return handleSendMessage(failedTurn.userText, failedTurn.pendingMedia);
      }
      return;
    }

    setErrorMsg('');
    setSending(true);

    try {
      let assistantText = '';
      let lastErrText = '';

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: historyToReplay,
              relationship,
              memories,
              preferredLanguage: aiLang,
            }),
          });

          if (response.ok) {
            const resData = await response.json();
            if (resData.reply) {
              assistantText = resData.reply;
              break;
            }
          }
          const data = await response.json().catch(() => ({}));
          lastErrText = data.error || (isAr ? 'خوادم الذكاء الاصطناعي تشهد ضغطاً مؤقتاً' : 'Server is busy');
          if (attempt < 2) await new Promise((r) => setTimeout(r, 1200));
        } catch (fetchErr: any) {
          lastErrText = fetchErr?.message || (isAr ? 'خطأ في الاتصال بالخادم' : 'Network error');
          if (attempt < 2) await new Promise((r) => setTimeout(r, 1200));
        }
      }

      if (!assistantText) {
        throw new Error(lastErrText || (isAr ? 'تعذر الحصول على رد من الذكاء الاصطناعي' : 'Failed to get reply'));
      }

      if (replacingMsgId) {
        await deleteMessage(userId, relationship.id, activeConv.id, replacingMsgId);
        const newAssistantMsg = await addMessage(userId, relationship.id, activeConv.id, {
          role: 'assistant',
          content: assistantText,
        });
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== replacingMsgId);
          return [...filtered, newAssistantMsg];
        });
      } else {
        const newAssistantMsg = await addMessage(userId, relationship.id, activeConv.id, {
          role: 'assistant',
          content: assistantText,
        });
        setMessages((prev) => [...prev, newAssistantMsg]);
      }

      setFailedTurn(null);
    } catch (err: any) {
      console.error('Retry error:', err);
      const rawMsg = String(err?.message || '');
      let cleanMsg = isAr
        ? 'خوادم الذكاء الاصطناعي تشهد ضغطاً مؤقتاً، اضغط على زر "إعادة المحاولة" للمحاولة مجدداً.'
        : 'AI is temporarily busy, please tap Retry to try again.';
      if (rawMsg.toLowerCase().includes('failed to fetch') || rawMsg.toLowerCase().includes('networkerror')) {
        cleanMsg = isAr ? 'تعذر الاتصال بالخادم، يرجى الضغط على زر "إعادة المحاولة".' : 'Network connection error, please tap Retry.';
      } else if (rawMsg) {
        cleanMsg = rawMsg;
      }
      setErrorMsg(cleanMsg);
    } finally {
      setSending(false);
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleUpdateRelationship = async (updates: Partial<Relationship>) => {
    await updateRelationship(userId, relationship.id, updates);
    const updated = { ...relationship, ...updates };
    onRelationshipUpdated(updated);
  };

  const handleAddMemory = async (data: Omit<MemoryItem, 'id' | 'relationshipId' | 'createdAt' | 'updatedAt'>) => {
    const newM = await addMemory(userId, relationship.id, data);
    setMemories((prev) => [newM, ...prev]);
  };

  const handleUpdateMemory = async (memId: string, updates: Partial<MemoryItem>) => {
    await updateMemory(userId, relationship.id, memId, updates);
    setMemories((prev) => prev.map((m) => (m.id === memId ? { ...m, ...updates } : m)));
  };

  const handleDeleteMemory = async (memId: string) => {
    await deleteMemory(userId, relationship.id, memId);
    setMemories((prev) => prev.filter((m) => m.id !== memId));
  };

  const handleClearAllMemories = async () => {
    await clearAllMemories(userId, relationship.id);
    setMemories([]);
  };

  const handleAddTimelineEvent = async (data: Omit<TimelineEvent, 'id' | 'relationshipId' | 'createdAt'>) => {
    const newE = await addTimelineEvent(userId, relationship.id, data);
    setTimelineEvents((prev) => [newE, ...prev]);
  };

  const handleDeleteTimelineEvent = async (eventId: string) => {
    await deleteTimelineEvent(userId, relationship.id, eventId);
    setTimelineEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  const quickPrompts = isAr
    ? [
        'حلل لي الموقف ده بموضوعية',
        'هو التصرف ده معناه إيه؟',
        'اقترح لي رد مناسب وطبيعي',
        'شايف دوري أنا إيه في ده؟',
        'قارن بين كلامه وتصرفاته السابقة',
      ]
    : [
        'Analyze this objectively',
        'What could this mean?',
        'Suggest a natural reply',
        'What was my role here?',
        'Compare with past behavior',
      ];

  const recentChatText = messages.map((m) => `${m.role === 'user' ? 'المستخدم' : 'الرفيق'}: ${m.content}`).join('\n');

  const isRomantic = relationship.relationshipType === 'romantic';
  const isFriendship = relationship.relationshipType === 'friendship';

  return (
    <div className="fixed inset-0 top-0 md:top-16 z-30 flex flex-col bg-stone-100 dark:bg-stone-950 overflow-hidden">
      {/* Mobile-Native App Bar */}
      <header className="shrink-0 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-3 sm:px-4 py-2.5 flex items-center justify-between shadow-xs z-20">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Back button with memory extraction */}
          <button
            onClick={handleRequestExit}
            className="p-2 -ms-1 rounded-xl text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 active:scale-95 transition"
            title={isAr ? 'العودة' : 'Back'}
          >
            {isAr ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>

          {/* Relationship Avatar */}
          <div
            className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs ${
              isRomantic
                ? 'bg-gradient-to-tr from-rose-500 to-pink-500'
                : isFriendship
                ? 'bg-gradient-to-tr from-amber-500 to-orange-500'
                : 'bg-gradient-to-tr from-indigo-500 to-purple-500'
            }`}
          >
            {isRomantic ? <Heart className="w-4 h-4" /> : isFriendship ? <Users className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          </div>

          {/* Title & Info */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 truncate">
                {relationship.displayName}
              </h2>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
              <span>
                {relationship.status || (isRomantic ? (isAr ? 'علاقة عاطفية' : 'Romantic') : isFriendship ? (isAr ? 'صداقة' : 'Friendship') : (isAr ? 'علاقة' : 'Relationship'))}
              </span>
              <span className="text-stone-300 dark:text-stone-600">•</span>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                {memories.length} {isAr ? 'معلومات محفوظة' : 'memories'}
              </span>
            </p>
          </div>
        </div>

        {/* Top Action Icons */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Quick Detailed Analysis button */}
          <button
            onClick={() => {
              setAnalysisInputText(messages.length > 0 ? messages[messages.length - 1].content : '');
              setShowDetailedAnalysis(true);
            }}
            className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 active:scale-95 transition flex items-center gap-1"
            title={isAr ? 'تحليل تفصيلي' : 'Detailed Analysis'}
          >
            <FileText className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            <span className="hidden sm:inline text-xs font-semibold">{isAr ? 'تحليل' : 'Analysis'}</span>
          </button>

          {/* Quick Reply Generator button */}
          <button
            onClick={() => {
              setReplyInputText(messages.length > 0 ? messages[messages.length - 1].content : '');
              setShowReplyGenerator(true);
            }}
            className="p-2 rounded-xl text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 active:scale-95 transition flex items-center gap-1"
            title={isAr ? 'صياغة رد' : 'Draft Reply'}
          >
            <MessageSquare className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            <span className="hidden sm:inline text-xs font-semibold">{isAr ? 'صياغة رد' : 'Reply'}</span>
          </button>

          {/* Memory Sheet button */}
          <button
            onClick={() => setActiveSheet('memory')}
            className="p-2 rounded-xl text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 active:scale-95 transition relative"
            title={isAr ? 'ذاكرة العلاقة' : 'Relationship Memory'}
          >
            <Brain className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            {memories.length > 0 && (
              <span className="absolute top-1 end-1 w-2 h-2 rounded-full bg-purple-500" />
            )}
          </button>

          {/* More menu button */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 active:scale-95 transition"
              title={isAr ? 'المزيد' : 'More'}
            >
              <MoreVertical className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>

            {showMoreMenu && (
              <div className="absolute end-0 mt-2 w-56 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl py-2 z-50 text-xs">
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowSessionsDrawer(true);
                  }}
                  className="w-full text-start px-4 py-2.5 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2.5 transition"
                >
                  <MessageCircle className="w-4 h-4 text-stone-400" />
                  <span>{isAr ? 'جلسات المحادثة' : 'Chat Sessions'} ({conversations.length})</span>
                </button>

                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    setActiveSheet('timeline');
                  }}
                  className="w-full text-start px-4 py-2.5 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2.5 transition"
                >
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <span>{isAr ? 'الخط الزمني ومقارنة الأنماط' : 'Timeline & Patterns'}</span>
                </button>

                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowEditModal(true);
                  }}
                  className="w-full text-start px-4 py-2.5 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2.5 transition"
                >
                  <Settings className="w-4 h-4 text-stone-400" />
                  <span>{isAr ? 'تعديل بيانات العلاقة' : 'Edit Relationship'}</span>
                </button>

                <div className="my-1 border-t border-stone-100 dark:border-stone-800" />

                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    setActiveSheet('settings');
                  }}
                  className="w-full text-start px-4 py-2.5 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2.5 transition"
                >
                  <FileText className="w-4 h-4 text-stone-400" />
                  <span>{isAr ? 'تصدير السجل وإدارة الحذف' : 'Export & Settings'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Full-Page Chat Body */}
      <div className="flex-1 flex flex-col min-h-0 bg-stone-50 dark:bg-stone-950 relative">
        {/* Error notification banner with quick Retry and restore options */}
        {errorMsg && (
          <div className="shrink-0 p-2.5 sm:p-3 bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between px-3 sm:px-4 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span className="truncate">{errorMsg}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {failedTurn?.userText && failedTurn.stage !== 'ai_reply' && (
                <button
                  type="button"
                  onClick={handleRestoreDraft}
                  className="px-2 py-1 rounded-lg border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-[11px] font-medium transition active:scale-95"
                  title="استعادة الرسالة إلى مربع النص للتعديل"
                >
                  {isAr ? 'استعادة النص' : 'Restore'}
                </button>
              )}
              <button
                type="button"
                onClick={() => handleRetry()}
                disabled={sending}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] flex items-center gap-1 shadow-xs transition active:scale-95 disabled:opacity-50"
              >
                <RotateCcw className={`w-3 h-3 ${sending ? 'animate-spin' : ''}`} />
                <span>{isAr ? 'إعادة المحاولة' : 'Retry'}</span>
              </button>
              <button
                type="button"
                onClick={() => setErrorMsg('')}
                className="p-1 text-rose-400 hover:text-rose-700 dark:hover:text-rose-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Messages Thread */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-3.5 overscroll-contain">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-stone-400 dark:text-stone-500 max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-rose-500/15 to-amber-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3.5 shadow-xs">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-stone-800 dark:text-stone-200">
                {isAr ? 'مرحباً بيك في محادثة التحليل' : 'Welcome to Relationship Intelligence'}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5 leading-relaxed">
                {isAr
                  ? `احكِ لـ رفيق العلاقات عن أي موقف حصل مع (${relationship.displayName})، أو الصق محادثة. هيرد عليك بصراحة وذكاء عاطفي وبناءً على الأدلة فقط بدون رموز مشتتة.`
                  : `Share a situation or paste messages with (${relationship.displayName}) for clear, evidence-based insights.`}
              </p>

              {/* Quick suggestions */}
              <div className="mt-5 flex flex-wrap gap-1.5 justify-center">
                {quickPrompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInputMessage(p);
                      textareaRef.current?.focus();
                    }}
                    className="text-[11px] px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-rose-300 dark:hover:border-rose-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 shadow-xs transition active:scale-95"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const isAssistant = m.role === 'assistant';
              return (
                <div
                  key={m.id}
                  className={`flex gap-2 max-w-[92%] sm:max-w-[80%] ${
                    isAssistant ? 'self-start' : 'self-end flex-row-reverse ms-auto'
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 shadow-2xs ${
                      isAssistant
                        ? 'bg-gradient-to-tr from-rose-500 to-amber-500 text-white'
                        : 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                    }`}
                  >
                    {isAssistant ? <Sparkles className="w-3.5 h-3.5" /> : (isAr ? 'أنت' : 'You')}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`group relative p-3 sm:p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs transition-all ${
                      isAssistant
                        ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-ts-none border border-stone-200/80 dark:border-stone-800/80'
                        : 'bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-te-none'
                    }`}
                    dir="auto"
                  >
                    {/* Render message attachments if present */}
                    {m.attachments && m.attachments.length > 0 && (
                      <MediaMessageBubble attachments={m.attachments} isUser={!isAssistant} />
                    )}

                    {/* Render message with clean formatting - no raw # or * symbols! */}
                    <FormattedMessage content={m.content} isAssistant={isAssistant} />

                    {/* Message Action Bar: Time, Retry, Copy, Delete */}
                    <div
                      className={`flex items-center justify-between gap-2 mt-2 pt-1.5 border-t text-[11px] ${
                        isAssistant
                          ? 'border-stone-100 dark:border-stone-800/80 text-stone-400'
                          : 'border-white/20 text-rose-100'
                      }`}
                    >
                      <span className="text-[10px]">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      <div className="flex items-center gap-1">
                        {/* Retry button */}
                        <button
                          type="button"
                          onClick={() => handleRetry(m.id)}
                          disabled={sending}
                          className={`p-1 rounded-md transition flex items-center gap-0.5 ${
                            isAssistant
                              ? 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
                              : 'text-rose-100 hover:text-white hover:bg-white/10'
                          }`}
                          title={isAr ? 'إعادة المحاولة / توليد جديد' : 'Retry'}
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span className="hidden sm:inline text-[10px]">{isAr ? 'إعادة' : 'Retry'}</span>
                        </button>

                        {/* Copy button */}
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(m.content, m.id)}
                          className={`p-1 rounded-md transition ${
                            isAssistant
                              ? 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
                              : 'text-rose-100 hover:text-white hover:bg-white/10'
                          }`}
                          title={isAr ? 'نسخ الرسالة' : 'Copy'}
                        >
                          {copiedMsgId === m.id ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>

                        {/* Delete message button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(m.id, m.attachments)}
                          className={`p-1 rounded-md transition ${
                            isAssistant
                              ? 'text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                              : 'text-rose-100 hover:text-white hover:bg-white/10'
                          }`}
                          title={isAr ? 'حذف هذه الرسالة' : 'Delete Message'}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    {/* Inline retry box if AI failed to answer this user message */}
                    {!isAssistant && failedTurn && failedTurn.stage === 'ai_reply' && failedTurn.userMsgId === m.id && (
                      <div className="mt-2.5 p-2 rounded-xl bg-amber-950/60 border border-amber-500/40 text-[11px] text-amber-100 flex items-center justify-between gap-2 shadow-xs">
                        <span className="truncate">
                          {isAr ? 'خوادم الذكاء الاصطناعي تشهد ضغطاً مؤقتاً.' : 'AI servers are temporarily busy.'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRetry(m.id)}
                          disabled={sending}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold flex items-center gap-1 shrink-0 transition active:scale-95 text-[10px]"
                        >
                          <RotateCcw className={`w-3 h-3 ${sending ? 'animate-spin' : ''}`} />
                          <span>{isAr ? 'إعادة المحاولة' : 'Retry'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {sending && (
            <div className="flex gap-2 max-w-[85%] self-start">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
              </div>
              <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 p-3 rounded-2xl rounded-ts-none text-xs text-stone-500 dark:text-stone-400 flex items-center gap-2 shadow-xs">
                <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>{isAr ? 'الرفيق يفكر ويحلل الموقف بالأدلة...' : 'Thinking and analyzing...'}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Pills right above the input */}
        <div className="shrink-0 px-3 py-1.5 overflow-x-auto flex items-center gap-1.5 border-t border-stone-200/50 dark:border-stone-800/50 bg-white/60 dark:bg-stone-900/60 backdrop-blur-xs no-scrollbar">
          {quickPrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => {
                setInputMessage(p);
                textareaRef.current?.focus();
              }}
              className="text-[10px] sm:text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap bg-stone-100 dark:bg-stone-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 text-stone-600 dark:text-stone-300 border border-stone-200/60 dark:border-stone-700/60 transition active:scale-95 shrink-0"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Sticky Mobile Input Bar: ENTER MAKES A NEW LINE AS REQUESTED! */}
        <div className="shrink-0 p-2 sm:p-3 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 shadow-md">
          {/* Pending Media Preview Strip */}
          <div className="max-w-4xl mx-auto mb-2">
            <MediaComposerStrip
              pendingItems={pendingMedia}
              onRemoveItem={handleRemovePendingMedia}
              onUpdateLabel={handleUpdatePendingMediaLabel}
              disabled={sending || uploadingMedia}
            />
          </div>

          {/* Uploading progress notification */}
          {uploadingMedia && (
            <div className="max-w-4xl mx-auto mb-2 p-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
              <span>{isAr ? 'جارٍ رفع ومعالجة المرفقات بأمان...' : 'Uploading and preparing media...'}</span>
            </div>
          )}

          <div className="max-w-4xl mx-auto flex items-end gap-2">
            {/* Hidden native mobile file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,.mp4,.mov,.webm,.3gp,.mkv,.avi,.heic,.jpg,.jpeg,.png,.webp,.gif"
              multiple
              className="hidden"
              onChange={handleFilesSelected}
            />

            {/* Media Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || uploadingMedia || pendingMedia.length >= 20}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition active:scale-95 flex items-center justify-center shrink-0 border border-stone-200/80 dark:border-stone-700/80 relative"
              title={isAr ? 'إرفاق صور أو فيديو' : 'Attach media'}
            >
              <Paperclip className="w-4 h-4 sm:w-5 sm:h-5 text-stone-500 dark:text-stone-400" />
              {pendingMedia.length > 0 && (
                <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                  {pendingMedia.length}
                </span>
              )}
            </button>

            <textarea
              ref={textareaRef}
              rows={1}
              value={inputMessage}
              onChange={handleTextareaInput}
              onKeyDown={(e) => {
                // EXPLICIT REQUIREMENT: "خلي لما المستخدم يدوس زرار الenter يعمل سطر جديد ميبعتش الرسالة من فضلك"
                // Regular Enter inserts a new line (default behavior).
                // Only send if user explicitly taps the Send button or uses Ctrl+Enter if on desktop.
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                pendingMedia.length > 0
                  ? (isAr ? 'اكتب سؤالك أو وصفك للمرفق... (أو اضغط إرسال)' : 'Describe attachments... (or tap send)')
                  : (isAr ? `اكتب موقفاً أو الصق محادثة... (اضغط إرسال)` : 'Type a situation or message... (Tap send)')
              }
              className="flex-1 min-h-[42px] max-h-[120px] px-3.5 py-2.5 rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs sm:text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none font-sans leading-relaxed"
            />

            {/* Prominent Send button */}
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={sending || uploadingMedia || (!inputMessage.trim() && pendingMedia.length === 0)}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-md shadow-rose-500/20 transition active:scale-95 disabled:opacity-40 flex items-center justify-center shrink-0"
              title={isAr ? 'إرسال الرسالة' : 'Send'}
            >
              {sending || uploadingMedia ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              ) : (
                <Send className="w-4 h-4 sm:w-5 sm:h-5 rtl:rotate-180" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Full Sheet: Memory Manager (Opens seamlessly without cramming chat) */}
      {activeSheet === 'memory' && (
        <div className="fixed inset-0 z-50 flex flex-col bg-stone-100 dark:bg-stone-950 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                {isAr ? 'ذاكرة وسياق العلاقة' : 'Relationship Memory'}
              </h2>
            </div>
            <button
              onClick={() => setActiveSheet('none')}
              className="p-1.5 rounded-xl text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full">
            <MemoryManager
              relationship={relationship}
              memories={memories}
              recentChatText={recentChatText}
              onAddMemory={handleAddMemory}
              onUpdateMemory={handleUpdateMemory}
              onDeleteMemory={handleDeleteMemory}
              onClearAllMemories={handleClearAllMemories}
              onUpdateSummary={(summary) => handleUpdateRelationship({ summary })}
            />
          </div>
        </div>
      )}

      {/* Full Sheet: Timeline & Comparison */}
      {activeSheet === 'timeline' && (
        <div className="fixed inset-0 z-50 flex flex-col bg-stone-100 dark:bg-stone-950 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                {isAr ? 'الخط الزمني ومقارنة الأنماط' : 'Timeline & Patterns'}
              </h2>
            </div>
            <button
              onClick={() => setActiveSheet('none')}
              className="p-1.5 rounded-xl text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full">
            <TimelineManager
              relationship={relationship}
              timelineEvents={timelineEvents}
              currentSituationContext={recentChatText}
              onAddEvent={handleAddTimelineEvent}
              onDeleteEvent={handleDeleteTimelineEvent}
            />
          </div>
        </div>
      )}

      {/* Full Sheet: Export & Settings */}
      {activeSheet === 'settings' && (
        <div className="fixed inset-0 z-50 flex flex-col bg-stone-100 dark:bg-stone-950 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-stone-600 dark:text-stone-400" />
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                {isAr ? 'التصدير وإدارة العلاقة' : 'Export & Settings'}
              </h2>
            </div>
            <button
              onClick={() => setActiveSheet('none')}
              className="p-1.5 rounded-xl text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full">
            <ExportSettingsView
              userId={userId}
              relationship={relationship}
              onDeleteRelationship={async () => {
                onRelationshipDeleted();
              }}
              onOpenEditModal={() => setShowEditModal(true)}
            />
          </div>
        </div>
      )}

      {/* Drawer: Chat Sessions Drawer */}
      {showSessionsDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-xs bg-white dark:bg-stone-900 h-full p-4 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800 mb-3">
              <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                {isAr ? 'جلسات المحادثة' : 'Chat Sessions'}
              </span>
              <button onClick={() => setShowSessionsDrawer(false)} className="p-1 text-stone-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={handleCreateNewConversation}
              className="w-full py-2.5 px-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 mb-3 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'بدء محادثة جديدة' : 'New Session'}</span>
            </button>

            <div className="flex-1 overflow-y-auto space-y-1.5">
              {conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setActiveConv(c);
                    setShowSessionsDrawer(false);
                  }}
                  className={`p-3 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                    activeConv?.id === c.id
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-900/50'
                      : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MessageCircle className="w-4 h-4 shrink-0 text-stone-400" />
                    <span className="truncate">{c.title}</span>
                  </div>

                  {conversations.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConvId(c.id);
                      }}
                      className="p-1 text-stone-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detailed Analysis Modal */}
      <DetailedAnalysisModal
        isOpen={showDetailedAnalysis}
        onClose={() => setShowDetailedAnalysis(false)}
        relationship={relationship}
        memories={memories}
        initialText={analysisInputText}
      />

      {/* Reply Generator Modal */}
      <ReplyGeneratorModal
        isOpen={showReplyGenerator}
        onClose={() => setShowReplyGenerator(false)}
        relationship={relationship}
        initialMessage={replyInputText}
      />

      {/* Edit Relationship Modal */}
      <EditRelationshipModal
        isOpen={showEditModal}
        relationship={relationship}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleUpdateRelationship}
      />

      {/* Delete Conversation Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deleteConvId)}
        title={isAr ? 'حذف هذه الجلسة' : 'Delete Conversation'}
        message={isAr ? 'هل أنت متأكد من حذف هذه المحادثة؟' : 'Are you sure you want to delete this session?'}
        confirmLabel={isAr ? 'حذف' : 'Delete'}
        onConfirm={async () => {
          if (deleteConvId) {
            await deleteConversation(userId, relationship.id, deleteConvId);
            setConversations((p) => p.filter((c) => c.id !== deleteConvId));
            if (activeConv?.id === deleteConvId) {
              const remaining = conversations.filter((c) => c.id !== deleteConvId);
              setActiveConv(remaining[0] || null);
            }
            setDeleteConvId(null);
          }
        }}
        onCancel={() => setDeleteConvId(null)}
      />

      {/* Exit Memory Extraction & Approval Modal */}
      <ExitMemoryModal
        isOpen={showExitMemoryModal}
        relationship={relationship}
        recentChatText={recentChatText}
        hasMessages={messages.length > 0}
        onSaveAndExit={handleSaveMemoriesAndExit}
        onSkipAndExit={handleSkipAndExit}
        onCancel={() => setShowExitMemoryModal(false)}
      />
    </div>
  );
};
