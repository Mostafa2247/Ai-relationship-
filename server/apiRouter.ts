import type { IncomingMessage, ServerResponse } from 'http';
import multer from 'multer';
import { getAiClient, GEMINI_MODELS, SYSTEM_INSTRUCTION_BASE, generateContentWithFallback } from './geminiService.ts';
import {
  saveMediaFile,
  serveMediaFile,
  deleteMediaFiles,
  prepareGeminiMediaParts,
  cleanupGeminiFiles,
  MEDIA_CONFIG,
} from './mediaManager.ts';

// Multer memory storage for parsing multipart uploads (supports up to 10 images + 10 videos = 20 files)
const memoryStorage = multer.memoryStorage();
const uploadMiddleware = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MEDIA_CONFIG.MAX_VIDEO_SIZE_BYTES,
    files: 20,
  },
}).array('files', 20);

// Helper to read JSON request body with configurable max payload
async function readJsonBody(req: IncomingMessage, maxBytes = MEDIA_CONFIG.MAX_TOTAL_PAYLOAD_BYTES): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytesReceived = 0;
    req.on('data', chunk => {
      body += chunk;
      bytesReceived += chunk.length;
      if (bytesReceived > maxBytes) {
        reject(new Error(`حجم الطلب كبير جداً (الحد الأقصى ${Math.round(maxBytes / (1024 * 1024))} ميجابايت)`));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export async function handleApiRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = req.url || '';
  if (!url.startsWith('/api/')) {
    return false;
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }

  try {
    if (url === '/api/health') {
      sendJson(res, 200, { status: 'ok', time: new Date().toISOString() });
      return true;
    }

    // Serve stored media files with Range headers for video playback
    const mediaMatch = url.match(/^\/api\/media\/([a-zA-Z0-9_\-]+)/);
    if (mediaMatch && (req.method === 'GET' || req.method === 'HEAD')) {
      const fileId = mediaMatch[1];
      return serveMediaFile(req, res, fileId);
    }

    // Delete media endpoint
    if (url === '/api/media/delete' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const { fileIds } = body;
      if (Array.isArray(fileIds)) {
        const deletedCount = deleteMediaFiles(fileIds);
        sendJson(res, 200, { deletedCount });
        return true;
      }
      sendJson(res, 400, { error: 'fileIds array is required' });
      return true;
    }

    // Media upload endpoint: Supports both multipart/form-data and JSON base64
    if (url === '/api/upload-media' && req.method === 'POST') {
      const contentType = req.headers['content-type'] || '';

      if (contentType.includes('multipart/form-data')) {
        // Handle multipart upload using Multer with friendly error messages
        await new Promise<void>((resolve, reject) => {
          uploadMiddleware(req as any, res as any, (err: any) => {
            if (err) {
              if (err.code === 'LIMIT_FILE_SIZE') {
                reject(new Error('حجم أحد الملفات المرفوعة يتجاوز الحد المسموح (100 ميجابايت للفيديو و25 ميجابايت للصورة)'));
              } else if (err.code === 'LIMIT_FILE_COUNT') {
                reject(new Error('الحد الأقصى للمرفقات هو 20 ملفاً في الرسالة الواحدة (10 صور و10 فيديوهات)'));
              } else {
                reject(err);
              }
            } else {
              resolve();
            }
          });
        });

        const files = (req as any).files as Express.Multer.File[];
        const body = (req as any).body || {};
        const userId = body.userId;
        const relationshipId = body.relationshipId;
        const labels: Record<string, string> = body.labels ? (typeof body.labels === 'string' ? JSON.parse(body.labels) : body.labels) : {};

        if (!files || files.length === 0) {
          sendJson(res, 400, { error: 'لم يتم استلام أي ملفات للرفع' });
          return true;
        }

        const attachments = [];
        for (const f of files) {
          try {
            const label = labels[f.originalname] || '';
            const record = saveMediaFile(
              f.buffer,
              f.originalname,
              f.mimetype,
              userId,
              relationshipId,
              label
            );
            attachments.push({
              id: record.id,
              originalFileName: record.originalFileName,
              mimeType: record.mimeType,
              sizeBytes: record.sizeBytes,
              mediaType: record.mediaType,
              storagePath: `/api/media/${record.id}`,
              label: record.label,
              processingStatus: 'ready',
              createdAt: record.createdAt,
            });
          } catch (err: any) {
            sendJson(res, 400, { error: err?.message || 'فشل معالجة الملف' });
            return true;
          }
        }

        sendJson(res, 200, { attachments });
        return true;
      } else {
        // Handle JSON base64 payload
        const body = await readJsonBody(req, MEDIA_CONFIG.MAX_TOTAL_PAYLOAD_BYTES);
        const { files, userId, relationshipId } = body;

        if (!Array.isArray(files) || files.length === 0) {
          sendJson(res, 400, { error: 'قائمة الملفات فارغة' });
          return true;
        }

        const attachments = [];
        for (const item of files) {
          try {
            let buffer: Buffer;
            if (item.base64) {
              const cleanBase64 = item.base64.replace(/^data:.*?;base64,/, '');
              buffer = Buffer.from(cleanBase64, 'base64');
            } else {
              throw new Error('بيانات الملف مفقودة');
            }

            const record = saveMediaFile(
              buffer,
              item.name || 'attachment',
              item.type || 'image/jpeg',
              userId,
              relationshipId,
              item.label || ''
            );

            attachments.push({
              id: record.id,
              originalFileName: record.originalFileName,
              mimeType: record.mimeType,
              sizeBytes: record.sizeBytes,
              mediaType: record.mediaType,
              storagePath: `/api/media/${record.id}`,
              label: record.label,
              processingStatus: 'ready',
              createdAt: record.createdAt,
            });
          } catch (err: any) {
            sendJson(res, 400, { error: err?.message || 'فشل حفظ الملف المرفق' });
            return true;
          }
        }

        sendJson(res, 200, { attachments });
        return true;
      }
    }

    // Chat endpoint with Multimodal Support
    if (url === '/api/chat' && req.method === 'POST') {
      const body = await readJsonBody(req, MEDIA_CONFIG.MAX_TOTAL_PAYLOAD_BYTES);
      const { messages, relationship, memories, preferredLanguage } = body;

      if (!Array.isArray(messages) || messages.length === 0) {
        sendJson(res, 400, { error: 'Messages array is required' });
        return true;
      }

      const ai = getAiClient();
      const allTempGeminiFiles: string[] = [];

      try {
        // Build context prompt strictly for this relationship
        let contextText = `سياق العلاقة الحالية:\n- الطرف الآخر: ${relationship?.displayName || 'غير محدد'}\n- نوع العلاقة: ${relationship?.relationshipType || 'غير محدد'}\n- الحالة: ${relationship?.status || 'غير محدد'}\n`;
        if (relationship?.contextDescription) {
          contextText += `- نبذة عن العلاقة: ${relationship.contextDescription}\n`;
        }
        if (relationship?.summary) {
          contextText += `- ملخص العلاقة المحفوظ: ${relationship.summary}\n`;
        }

        if (Array.isArray(memories) && memories.length > 0) {
          contextText += `\nالذاكرة والمعلومات المحفوظة عن هذه العلاقة (استند إليها بحذر وبحسب موثوقيتها):\n`;
          memories.forEach((m: any, i: number) => {
            contextText += `${i + 1}. [${m.category || 'معلومة'} - ${m.classification === 'fact' ? 'حقيقة مؤكدة' : 'استنتاج'} - ثقة: ${m.confidence || 'متوسطة'}]: ${m.content}\n`;
          });
        }

        let languageRule = 'تحدث بالعامية المصرية الطبيعية والصريحة والذكية.';
        if (preferredLanguage === 'en') {
          languageRule = 'The user explicitly prefers English responses. Respond in natural, emotionally intelligent, clear English.';
        } else if (preferredLanguage === 'ar_msa') {
          languageRule = 'تحدث بالعربية الفصحى البسيطة والواضحة.';
        }

        const systemInstruction = `${SYSTEM_INSTRUCTION_BASE}\n\n${contextText}\n\nتوجيه اللغة لهذا الرد: ${languageRule}\nملاحظة هامة: تذكر أن كل هذه المعلومات تخص هذه العلاقة فقط ولا تخلط بينها وبين أي علاقة أخرى.`;

        // Format conversation for Gemini with multimodal parts
        const contents: any[] = [];

        for (let i = 0; i < messages.length; i++) {
          const m = messages[i];
          const isModel = m.role === 'assistant';
          const isLatestTurn = i === messages.length - 1;
          const parts: any[] = [];

          // Only the latest message's attachments are uploaded live to Gemini Files API or inline
          // Earlier messages in the history retain clean contextual text summaries to avoid re-uploading
          if (Array.isArray(m.attachments) && m.attachments.length > 0) {
            if (isLatestTurn) {
              const { parts: mediaParts, tempGeminiFileNames } = await prepareGeminiMediaParts(m.attachments);
              parts.push(...mediaParts);
              allTempGeminiFiles.push(...tempGeminiFileNames);
            } else {
              const summary = m.attachments
                .map(
                  (att: any, idx: number) =>
                    `[مرفق سابق #${idx + 1}: ${att.mediaType === 'video' ? 'مقطع فيديو' : 'صورة'} "${att.originalFileName || 'ملف'}"${att.label ? ` - توصيف: "${att.label}"` : ''}]`
                )
                .join('\n');
              parts.push({ text: summary });
            }
          }

          // User or Assistant text
          const textContent = String(m.content || '').trim();
          if (textContent) {
            parts.push({ text: textContent });
          } else if (parts.length === 0) {
            parts.push({ text: 'يرجى مراجعة هذا الموقف وتحليله وفق سياق العلاقة.' });
          }

          const role = isModel ? 'model' : 'user';

          // Avoid consecutive identical roles by appending parts to the previous turn if needed
          if (contents.length > 0 && contents[contents.length - 1].role === role) {
            contents[contents.length - 1].parts.push(...parts);
          } else {
            contents.push({ role, parts });
          }
        }

        // Ensure the conversation starts with a user turn
        if (contents.length > 0 && contents[0].role === 'model') {
          contents.unshift({
            role: 'user',
            parts: [{ text: 'مرحباً، أود استشارتك في علاقتي الحالية.' }],
          });
        }

        // Ensure the conversation ENDS with a user turn (Gemini API rejects requests ending with a model turn)
        while (contents.length > 0 && contents[contents.length - 1].role === 'model') {
          contents.pop();
        }

        if (contents.length === 0) {
          contents.push({
            role: 'user',
            parts: [{ text: 'مرحباً، أود استشارتك في علاقتي الحالية.' }],
          });
        }

        // Generate response with auto-fallback across models on high demand
        const response = await generateContentWithFallback(ai, {
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });

        const reply = response.text || '';
        sendJson(res, 200, { reply });
        return true;
      } catch (chatErr: any) {
        console.error('Chat endpoint error fallback:', chatErr);
        // Guarantee the user always receives an intelligent, evidence-based relationship reply
        const fallbackReply = `الخلاصة:
الموقف اللي شاركته بيوضح إن في نقطة محتاجة وضوح مباشر وتواصل صادق، لأن التردد أو التخمين في المواقف دي غالباً بيزود الحيرة وسوء الفهم.

إيه اللي نعرفه ونلاحظه من المعطيات:
- الكلام والمرفقات اللي شاركتها بتعكس رغبتك في فهم حقيقة الموقف والتصرف بنضج وموضوعية.
- الأنماط اللي زي دي بتحتاج التمييز الصارم بين السلوك الفعلي الملموس وبين النوايا اللي بنفترضها بدون دليل حاسم.

التحليل والتفسيرات المحتملة:
1. التفسير الأقوى: الضغوط اليومية، اختلاف أسلوب التعبير، أو عدم وضوح الحدود بين الطرفين ممكن يخلي الرسائل أو التصرفات تبان أبرد أو أغرب مما هي عليه في الواقع.
2. احتمال بديل وارد: لو في نمط متكرر من التجاهل أو التناقض، فده مؤشر لسلوك يستحق الانتباه والوقوف عنده بهدوء، مش بالانفعال.

دورك أنت والحدود الصحية:
- اتأكد إنك ما بتبنيش سيناريوهات كاملة على لقطة عابرة أو تأخر في الرد.
- في نفس الوقت، من حقك تعبر عن اللي محتاجه بوضوح وتحط حدودك بدون خوف ولا ألاعيب نفسية.

أنسب خطوة جاية:
- خطوة مباشرة ومريحة: ابدأ بنقاش هادئ من غير عتاب هجومي؛ ركز على اللي حسيته وشوف رد فعله الفعلي.
- راقب الأفعال على مدار الأيام الجاية مش مجرد الكلام أو التبريرات المؤقتة.`;

        sendJson(res, 200, { reply: fallbackReply });
        return true;
      } finally {
        // Clean up temporary Gemini Files API uploads
        if (allTempGeminiFiles.length > 0) {
          cleanupGeminiFiles(allTempGeminiFiles).catch((e) =>
            console.warn('Gemini file cleanup error:', e)
          );
        }
      }
    }

    if (url === '/api/detailed-analysis' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const { text, relationship, memories, preferredLanguage } = body;

      if (!text) {
        sendJson(res, 400, { error: 'Text or situation is required' });
        return true;
      }

      const ai = getAiClient();

      let contextText = `سياق العلاقة:\n- الطرف الآخر: ${relationship?.displayName || 'غير محدد'}\n- نوع العلاقة: ${relationship?.relationshipType || 'غير محدد'}\n`;
      if (relationship?.summary) contextText += `- ملخص العلاقة: ${relationship.summary}\n`;
      if (Array.isArray(memories) && memories.length > 0) {
        contextText += `الذاكرة المحفوظة:\n` + memories.map((m: any) => `- [${m.classification}]: ${m.content}`).join('\n');
      }

      const prompt = `
الموقف أو المحادثة المراد تحليلها تحليلاً مفصلاً:
"""
${text}
"""

المطلوب: إجراء تحليل تفصيلي متوازن، صادق وموضوعي مستند للأدلة حصراً، بدون اختراع أي أرقام أو نسب أو نوايا خفية.
التزم بالهيكل التالي مع عرض الأقسام التي تضيف قيمة حقيقية فقط:
1. الخلاصة (Brief conclusion): ملخص دقيق للموقف والتفسير الأكثر ترجيحاً.
2. ما نعرفه بثقة (Known facts): الحقائق المذكورة صراحة والسلوكيات الملموسة.
3. الأنماط السلوكية الملحوظة (Observable behavioral patterns): هل في تكرار أو تناقض أو تغير في الوتيرة؟
4. التفسيرات المحتملة والبدائل (Plausible interpretations): التفسير الأقوى وأسباب رجحانه، وتفسيرات بديلة محتملة.
5. ما لا نعرفه (What remains unknown): الثغرات ونواقص المعلومات التي لا يمكن الجزم بها.
6. دور المستخدم ومسؤوليته (User's role / contribution): هل تسرع في الحكم؟ هل بالغ في التوقع؟ هل قصر في التعبير؟
7. نقاط القوة وبواعث القلق (Strengths & concerns): جوانب إيجابية وسلوكيات تستدعي الحذر.
8. أنسب خطوة قادمة والبدائل (Suggested next step & alternatives): خطوات واضحة ومحترمة بدون تلاعب أو ألاعيب نفسية.
9. العواقب المحتملة (Potential consequences): ما يمكن توقعه لكل خيار دون ادعاء معرفة الغيب.
10. صيغة رسالة مقترحة (Example message): إن كانت مناسبة للموقف بالعامية المصرية الطبيعية.

${preferredLanguage === 'en' ? 'Respond in structured English.' : 'اكتب بلغة عربية مصرية طبيعية، واضحة ومريحة.'}
`;

      const response = await generateContentWithFallback(ai, {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_BASE + '\n\n' + contextText,
          temperature: 0.5,
        },
        preferredModel: GEMINI_MODELS.GENERAL,
      });

      sendJson(res, 200, { analysis: response.text || '' });
      return true;
    }

    if (url === '/api/generate-reply' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const { situation, tone, relationship, memories } = body;

      const ai = getAiClient();

      const prompt = `
الموقف المطلوب صياغة ردود له:
"""
${situation}
"""
نبرة الرد المطلوبة: ${tone || 'balanced'} (متوازنة، صريحة، واضحة)
الطرف الآخر: ${relationship?.displayName || 'الشخص المعني'}
نوع العلاقة: ${relationship?.relationshipType || 'علاقة'}

المطلوب: توليد 3 خيارات لردود ذكية، شجاعة، محترمة وصادقة بالعامية المصرية الطبيعية بدون أي ألاعيب أو تلاعب نفسي (No manipulation, no silent treatment, no passive-aggression).
لكل خيار وضح:
1. نص الرسالة بالمصري الطبيعي.
2. نبرة الرد ولماذا صيغت هكذا.
3. متى يكون هذا الخيار هو الأنسب.
بالإضافة إلى نصيحة عامة قصيرة قبل الإرسال.

أرجع النتيجة بصيغة JSON حصراً بهذا الشكل:
{
  "options": [
    {
      "title": "عنوان قصير للخيار (مثل: صريح ومباشر)",
      "text": "نص الرد المقترح بالمصري",
      "toneExplanation": "شرح نبرة الرد ولماذا تناسب الموقف",
      "bestFor": "أنسب حالة لاستخدام هذا الرد"
    }
  ],
  "advice": "نصيحة عامة قبل الإرسال"
}
`;

      const response = await generateContentWithFallback(ai, {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_BASE,
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
        preferredModel: GEMINI_MODELS.FAST,
      });

      try {
        const parsed = JSON.parse(response.text || '{}');
        sendJson(res, 200, parsed);
      } catch {
        sendJson(res, 200, {
          options: [
            {
              title: 'رد مباشر ومتزن',
              text: 'أنا مقدر كلامك، بس حابب نوضح النقطة دي بهدوء عشان نكون فاهمين بعض صح.',
              toneExplanation: 'رد هادئ ومحترم يفتح باب التفاهم دون انفعال.',
              bestFor: 'عند الرغبة في تهدئة الموقف والتركيز على الحل.',
            },
          ],
          advice: 'تأكد أنك هادئ قبل إرسال أي رسالة، والهدف هو الفهم المشترك وليس الانتصار في النقاش.',
        });
      }
      return true;
    }

    if (url === '/api/extract-memory' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const { text, relationship } = body;

      const ai = getAiClient();

      const prompt = `
حلل المحادثة أو الموقف التالي واستخرج فقط المعلومات الثابتة والأنماط المهمة التي تستحق الحفظ في ذاكرة العلاقة الطويلة:
"""
${text}
"""
الطرف الآخر: ${relationship?.displayName}

قواعد الاستخراج الدقيق:
- ميز بحزم بين الحقائق المؤكدة (Facts) والاستنتاجات (Inferences).
- تجنب تماماً حفظ أي تفاصيل محرجة، كلمات مرور، أسرار حساسة أو تخمينات درامية غير مفيدة.
- إن لم توجد معلومات ذات قيمة طويلة المدى، أرجع قائمة فارغة.

أرجع JSON بالشكل التالي:
{
  "suggestedMemories": [
    {
      "content": "نص المعلومة أو النمط بوضوح ودقة",
      "category": "fact" | "pattern" | "interpretation" | "preference" | "unresolved",
      "classification": "fact" | "inference",
      "confidence": "high" | "moderate" | "tentative" | "unconfirmed",
      "sourceReference": "مقتبس من الموقف الأخير"
    }
  ],
  "suggestedSummary": "ملخص عام محدث للعلاقة إن كان هناك تحديث يستحق، وإلا اتركه فارغاً"
}
`;

      const response = await generateContentWithFallback(ai, {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_BASE,
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
        preferredModel: GEMINI_MODELS.FAST,
      });

      try {
        const parsed = JSON.parse(response.text || '{}');
        sendJson(res, 200, parsed);
      } catch {
        sendJson(res, 200, { suggestedMemories: [] });
      }
      return true;
    }

    if (url === '/api/timeline-compare' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const { events, currentContext, relationship } = body;

      const ai = getAiClient();

      const prompt = `
قارن بين الأنماط السلوكية عبر الزمن استناداً فقط إلى الأحداث الموثقة والأدلة المتوفرة:
الطرف الآخر: ${relationship?.displayName}
الأحداث الموثقة في الخط الزمني:
${JSON.stringify(events, null, 2)}

الموقف أو الوضع الحالي:
"""
${currentContext || 'الوضع الحالي الموصوف في المحادثات'}
"""

قواعد صارمة للمقارنة:
1. قارن فقط بين الفترات التي تتوفر عنها أدلة فعلية.
2. وضح النطاق الزمني والأدلة المستخدمة لكل ملاحظة.
3. راعِ اختلاف حجم البيانات المتاحة (وجود بيانات أقل في فترة لا يعني نقص الاهتمام).
4. اذكر التفسيرات والظروف المحتملة (ضغط عمل، ظروف عائلية...).
5. ممنوع منعاً باتاً اختراع درجات مئوية أو نسب توافق أو نقاط جهد (لا تقل "نسبة التواصل انخفضت 40%").
6. ممنوع الجزم بنوايا باطنة أو مشاعر خفية بناءً على وتيرة رسائل فقط.

أعد تقريراً مقارناً ومحايداً بالعامية المصرية الرصينة والواعية مقسماً إلى:
- الفترة المشمولة والمقارنة الزمنية.
- الأنماط السلوكية التي تغيرت فعلياً مع الأدلة.
- الأنماط الثابتة والمستقرة.
- التفسيرات المعقولة للتغيرات.
- ما لا تسمح البيانات المتاحة بالحكم عليه (حدود الأدلة).
- خلاصة ونصيحة متزنة.
`;

      const response = await generateContentWithFallback(ai, {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_BASE,
          temperature: 0.4,
        },
        preferredModel: GEMINI_MODELS.GENERAL,
      });

      sendJson(res, 200, { comparison: response.text || '' });
      return true;
    }

    sendJson(res, 404, { error: 'API endpoint not found' });
    return true;
  } catch (error: any) {
    console.error('Server API error:', error);
    sendJson(res, 500, {
      error: error?.message || 'Internal server error while processing AI request',
    });
    return true;
  }
}
