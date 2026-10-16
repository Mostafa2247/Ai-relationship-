import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type { Relationship, Conversation, Message, MemoryItem, TimelineEvent, MediaAttachment } from '../types';

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============ RELATIONSHIPS ============
export async function getRelationships(userId: string): Promise<Relationship[]> {
  const colPath = `users/${userId}/relationships`;
  try {
    const q = query(collection(db, colPath), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Relationship));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colPath);
  }
}

export async function createRelationship(
  userId: string,
  data: { displayName: string; relationshipType: 'romantic' | 'friendship' | 'other'; status?: string; contextDescription?: string }
): Promise<Relationship> {
  const relId = generateId();
  const docPath = `users/${userId}/relationships/${relId}`;
  const now = new Date().toISOString();
  const newRel: Relationship = {
    id: relId,
    userId,
    displayName: data.displayName.trim(),
    relationshipType: data.relationshipType,
    status: data.status || 'نشطة',
    contextDescription: data.contextDescription || '',
    summary: '',
    archived: false,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'users', userId, 'relationships', relId), newRel);
    return newRel;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function updateRelationship(
  userId: string,
  relId: string,
  data: Partial<Relationship>
): Promise<void> {
  const docPath = `users/${userId}/relationships/${relId}`;
  try {
    const ref = doc(db, 'users', userId, 'relationships', relId);
    await updateDoc(ref, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function deleteRelationship(userId: string, relId: string): Promise<void> {
  const relDocPath = `users/${userId}/relationships/${relId}`;
  try {
    // 1. Delete all conversations and messages
    const convCol = collection(db, 'users', userId, 'relationships', relId, 'conversations');
    const convSnap = await getDocs(convCol);
    for (const cDoc of convSnap.docs) {
      const msgCol = collection(db, 'users', userId, 'relationships', relId, 'conversations', cDoc.id, 'messages');
      const msgSnap = await getDocs(msgCol);
      for (const mDoc of msgSnap.docs) {
        await deleteDoc(mDoc.ref);
      }
      await deleteDoc(cDoc.ref);
    }

    // 2. Delete all memories
    const memCol = collection(db, 'users', userId, 'relationships', relId, 'memory');
    const memSnap = await getDocs(memCol);
    for (const mDoc of memSnap.docs) {
      await deleteDoc(mDoc.ref);
    }

    // 3. Delete all timeline events
    const timeCol = collection(db, 'users', userId, 'relationships', relId, 'timeline');
    const timeSnap = await getDocs(timeCol);
    for (const tDoc of timeSnap.docs) {
      await deleteDoc(tDoc.ref);
    }

    // 4. Delete relationship doc
    await deleteDoc(doc(db, 'users', userId, 'relationships', relId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, relDocPath);
  }
}

// ============ CONVERSATIONS ============
export async function getConversations(userId: string, relId: string): Promise<Conversation[]> {
  const colPath = `users/${userId}/relationships/${relId}/conversations`;
  try {
    const q = query(collection(db, colPath), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Conversation));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colPath);
  }
}

export async function createConversation(userId: string, relId: string, title?: string): Promise<Conversation> {
  const convId = generateId();
  const docPath = `users/${userId}/relationships/${relId}/conversations/${convId}`;
  const now = new Date().toISOString();
  const newConv: Conversation = {
    id: convId,
    relationshipId: relId,
    title: title || 'محادثة جديدة',
    lastMessagePreview: '',
    createdAt: now,
    updatedAt: now,
  };
  try {
    await setDoc(doc(db, 'users', userId, 'relationships', relId, 'conversations', convId), newConv);
    return newConv;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

// ============ MESSAGES ============
export async function getMessages(userId: string, relId: string, convId: string): Promise<Message[]> {
  const colPath = `users/${userId}/relationships/${relId}/conversations/${convId}/messages`;
  try {
    const q = query(collection(db, colPath), orderBy('createdAt', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colPath);
  }
}

export async function addMessage(
  userId: string,
  relId: string,
  convId: string,
  data: { role: 'user' | 'assistant' | 'system'; content: string; analysisType?: string; attachments?: MediaAttachment[] }
): Promise<Message> {
  const msgId = generateId();
  const docPath = `users/${userId}/relationships/${relId}/conversations/${convId}/messages/${msgId}`;
  const now = new Date().toISOString();
  const newMsg: Message = {
    id: msgId,
    role: data.role,
    content: data.content,
    analysisType: data.analysisType || '',
    createdAt: now,
    ...(data.attachments && data.attachments.length > 0 ? { attachments: data.attachments } : {}),
  };

  try {
    await setDoc(doc(db, 'users', userId, 'relationships', relId, 'conversations', convId, 'messages', msgId), newMsg);
    // update conversation preview and time
    const previewText = data.content || (data.attachments?.length ? `[${data.attachments.length} مرفق]` : '');
    await updateDoc(doc(db, 'users', userId, 'relationships', relId, 'conversations', convId), {
      lastMessagePreview: previewText.slice(0, 120),
      updatedAt: now,
    });
    return newMsg;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function deleteMessage(
  userId: string,
  relId: string,
  convId: string,
  messageId: string,
  attachments?: MediaAttachment[]
): Promise<void> {
  const docPath = `users/${userId}/relationships/${relId}/conversations/${convId}/messages/${messageId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'relationships', relId, 'conversations', convId, 'messages', messageId));
    
    // Clean up server-stored media files if any
    if (attachments && attachments.length > 0) {
      const fileIds = attachments.map(a => a.id).filter(Boolean);
      if (fileIds.length > 0) {
        fetch('/api/media/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileIds, userId, relationshipId: relId })
        }).catch(err => console.warn('Failed to clean up media files on server:', err));
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function deleteConversation(userId: string, relId: string, convId: string): Promise<void> {
  const convDocPath = `users/${userId}/relationships/${relId}/conversations/${convId}`;
  try {
    const msgCol = collection(db, 'users', userId, 'relationships', relId, 'conversations', convId, 'messages');
    const msgSnap = await getDocs(msgCol);
    for (const d of msgSnap.docs) {
      await deleteDoc(d.ref);
    }
    await deleteDoc(doc(db, 'users', userId, 'relationships', relId, 'conversations', convId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, convDocPath);
  }
}

// ============ MEMORY ============
export async function getMemories(userId: string, relId: string): Promise<MemoryItem[]> {
  const colPath = `users/${userId}/relationships/${relId}/memory`;
  try {
    const q = query(collection(db, colPath), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MemoryItem));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colPath);
  }
}

export async function addMemory(
  userId: string,
  relId: string,
  data: Omit<MemoryItem, 'id' | 'relationshipId' | 'createdAt' | 'updatedAt'>
): Promise<MemoryItem> {
  const memId = generateId();
  const docPath = `users/${userId}/relationships/${relId}/memory/${memId}`;
  const now = new Date().toISOString();
  const newMem: MemoryItem = {
    id: memId,
    relationshipId: relId,
    content: data.content.trim(),
    category: data.category,
    classification: data.classification,
    confidence: data.confidence || 'moderate',
    sourceReference: data.sourceReference || '',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'users', userId, 'relationships', relId, 'memory', memId), newMem);
    return newMem;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function updateMemory(
  userId: string,
  relId: string,
  memId: string,
  data: Partial<MemoryItem>
): Promise<void> {
  const docPath = `users/${userId}/relationships/${relId}/memory/${memId}`;
  try {
    await updateDoc(doc(db, 'users', userId, 'relationships', relId, 'memory', memId), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function deleteMemory(userId: string, relId: string, memId: string): Promise<void> {
  const docPath = `users/${userId}/relationships/${relId}/memory/${memId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'relationships', relId, 'memory', memId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function clearAllMemories(userId: string, relId: string): Promise<void> {
  const colPath = `users/${userId}/relationships/${relId}/memory`;
  try {
    const snap = await getDocs(collection(db, colPath));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, colPath);
  }
}

// ============ TIMELINE ============
export async function getTimelineEvents(userId: string, relId: string): Promise<TimelineEvent[]> {
  const colPath = `users/${userId}/relationships/${relId}/timeline`;
  try {
    const q = query(collection(db, colPath), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TimelineEvent));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colPath);
  }
}

export async function addTimelineEvent(
  userId: string,
  relId: string,
  data: Omit<TimelineEvent, 'id' | 'relationshipId' | 'createdAt'>
): Promise<TimelineEvent> {
  const eventId = generateId();
  const docPath = `users/${userId}/relationships/${relId}/timeline/${eventId}`;
  const now = new Date().toISOString();
  const newEvent: TimelineEvent = {
    id: eventId,
    relationshipId: relId,
    eventSummary: data.eventSummary.trim(),
    date: data.date,
    evidenceNotes: data.evidenceNotes || '',
    sourceReference: data.sourceReference || '',
    createdAt: now,
  };

  try {
    await setDoc(doc(db, 'users', userId, 'relationships', relId, 'timeline', eventId), newEvent);
    return newEvent;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function deleteTimelineEvent(userId: string, relId: string, eventId: string): Promise<void> {
  const docPath = `users/${userId}/relationships/${relId}/timeline/${eventId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'relationships', relId, 'timeline', eventId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

// ============ EXPORT ============
export async function exportRelationshipData(userId: string, relId: string) {
  const relDoc = await getDoc(doc(db, 'users', userId, 'relationships', relId));
  if (!relDoc.exists()) throw new Error('Relationship not found');
  const relationship = relDoc.data() as Relationship;

  const convs = await getConversations(userId, relId);
  const convsWithMessages = await Promise.all(
    convs.map(async (c) => {
      const msgs = await getMessages(userId, relId, c.id);
      return { ...c, messages: msgs };
    })
  );

  const memories = await getMemories(userId, relId);
  const timeline = await getTimelineEvents(userId, relId);

  const exportObject = {
    relationship,
    conversations: convsWithMessages,
    memories,
    timeline,
    exportedAt: new Date().toISOString(),
  };

  // Build human-readable text report
  let textReport = `========================================\n`;
  textReport += `تقرير سجل العلاقة: ${relationship.displayName}\n`;
  textReport += `نوع العلاقة: ${relationship.relationshipType} | الحالة: ${relationship.status || 'نشطة'}\n`;
  textReport += `تاريخ الإنشاء: ${new Date(relationship.createdAt).toLocaleDateString('ar-EG')}\n`;
  if (relationship.contextDescription) {
    textReport += `نبذة عامة: ${relationship.contextDescription}\n`;
  }
  if (relationship.summary) {
    textReport += `ملخص العلاقة الحالي: ${relationship.summary}\n`;
  }
  textReport += `========================================\n\n`;

  textReport += `--- الذاكرة والمعطيات المحفوظة (${memories.length}) ---\n`;
  memories.forEach((m, idx) => {
    textReport += `${idx + 1}. [${m.category}] [${m.classification === 'fact' ? 'حقيقة' : 'استنتاج'} - ثقة: ${m.confidence}]: ${m.content}\n`;
  });

  textReport += `\n--- الأحداث والخط الزمني (${timeline.length}) ---\n`;
  timeline.forEach((t, idx) => {
    textReport += `${idx + 1}. [${t.date}] ${t.eventSummary}\n   ملاحظات الأدلة: ${t.evidenceNotes || 'لا يوجد'}\n`;
  });

  textReport += `\n--- المحادثات السابقة (${convsWithMessages.length}) ---\n`;
  convsWithMessages.forEach((c) => {
    textReport += `\n# محادثة: ${c.title} (${new Date(c.createdAt).toLocaleString('ar-EG')})\n`;
    c.messages.forEach((m) => {
      const roleName = m.role === 'user' ? 'أنت' : 'رفيق العلاقات (الذكاء الاصطناعي)';
      textReport += `[${roleName}]: ${m.content}\n\n`;
    });
  });

  return {
    jsonData: JSON.stringify(exportObject, null, 2),
    textData: textReport,
    displayName: relationship.displayName,
  };
}
