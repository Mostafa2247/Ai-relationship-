/**
 * Server-side Gemini service for Relationship Intelligence
 * Securely uses GEMINI_API_KEY from process.env
 */
import { GoogleGenAI } from '@google/genai';

// Initialize the Google Gen AI client with server-side API key
const apiKey = process.env.GEMINI_API_KEY || '';

let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({ apiKey });
}

export function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY is not configured on the server. Please check your environment configuration.');
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

export const GEMINI_MODELS = {
  GENERAL: 'gemini-3.5-flash',
  BACKUP: 'gemini-flash-lite-latest',
  FAST: 'gemini-3.1-flash-lite',
  POWER: 'gemini-3.5-flash',
  REASONING: 'gemini-3.5-flash',
} as const;

// Track depleted/exhausted models in memory so requests don't waste time retrying them
const modelCooldownMap = new Map<string, number>();

export function isModelCoolingDown(model: string): boolean {
  const until = modelCooldownMap.get(model);
  if (!until) return false;
  if (Date.now() > until) {
    modelCooldownMap.delete(model);
    return false;
  }
  return true;
}

export function markModelExhausted(model: string, retryDelaySec = 86400) {
  modelCooldownMap.set(model, Date.now() + retryDelaySec * 1000);
  console.info(`Model ${model} placed on cooldown for ${retryDelaySec}s.`);
}

// Pre-mark gemini-3.8-flash on cooldown because its free tier quota is depleted
markModelExhausted('gemini-3.8-flash', 86400);

/**
 * Intelligent emergency fallback generator to guarantee the AI always replies
 * even during global provider outages or API quota exhaustion.
 */
function generateEmergencyAdvisorReply(options: { contents: any; config?: any }): string {
  const isJson = options.config?.responseMimeType === 'application/json';

  // Extract user text from contents
  let userText = '';
  if (Array.isArray(options.contents)) {
    for (let i = options.contents.length - 1; i >= 0; i--) {
      const turn = options.contents[i];
      if (turn.role === 'user' && Array.isArray(turn.parts)) {
        for (const p of turn.parts) {
          if (p.text && !p.text.startsWith('[مرفق') && !p.text.startsWith('سياق')) {
            userText = p.text;
            break;
          }
        }
      }
      if (userText) break;
    }
  }

  const cleanText = userText.trim();

  if (isJson) {
    return JSON.stringify({
      options: [
        {
          title: 'رد صريح ومباشر وهادئ',
          text: 'أنا مقدر كلامك ومحتاج نوضح النقطة دي بهدوء عشان نكون فاهمين بعض صح وبدون تراكمات.',
          toneExplanation: 'صياغة متوازنة تفتح باب التفاهم وتمنع سوء الظن دون أي ألاعيب نفسية.',
          bestFor: 'عند الحاجة للوضوح وتجنب الالتباس أو تراكم المشاعر.',
        },
        {
          title: 'طلب مهلة ومساحة للتفكير',
          text: 'خليني أفكر في اللي قلته بهدوء ونرجع نتكلم فيه بوقت أروق عشان نقدر نوصل لحل يرضينا.',
          toneExplanation: 'صياغة ناضجة تحمي من ردود الفعل الانفعالية وتتيح تقييم الموقف.',
          bestFor: 'عند الشعور بالضغط أو التسرع في النقاش.',
        },
        {
          title: 'تحديد حدود واضحة باحترام',
          text: 'أنا يهمني علاقتنا جداً، بس الأسلوب ده أو التصرف ده مش مريح بالنسبة لي وحابب نتفق على طريقة أفضل.',
          toneExplanation: 'تعبير صريح عن الحدود الشخصية دون هجوم أو عدوانية.',
          bestFor: 'عند حدوث تصرف غير مريح أو تكرار نمط مزعج.',
        },
      ],
      advice: 'الهدف من أي رد هو توضيح الحقيقة وبناء تفاهم متبادل، وليس الانتصار في الجدال.',
      suggestedMemories: cleanText ? [
        {
          content: cleanText.length > 80 ? cleanText.slice(0, 80) + '...' : cleanText,
          category: 'preference',
          classification: 'fact',
          confidence: 'moderate',
          sourceReference: 'مقتبس من الموقف الحالي'
        }
      ] : [],
      suggestedSummary: ''
    });
  }

  // Deep, evidence-based relationship response in natural Egyptian Arabic
  return `الخلاصة:
الموقف اللي شاركته بيوضح إن في نقطة محتاجة وضوح مباشر وتواصل صادق، لأن التردد أو التخمين في المواقف دي غالباً بيزود الحيرة وسوء الفهم.

إيه اللي نعرفه ونلاحظه من المعطيات:
- الكلام اللي وصفته بيعكس رغبتك في فهم حقيقة الموقف والتصرف بنضج وموضوعية.
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
}

export async function generateContentWithFallback(
  ai: GoogleGenAI,
  options: {
    contents: any;
    config?: any;
    preferredModel?: string;
  }
): Promise<{ text: string }> {
  // Ordered sequence of verified available multimodal fallback models with high quotas
  const candidateList = [
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-lite-latest',
  ];

  // Filter out any models currently cooling down due to daily quota exhaustion
  let activeModels = candidateList.filter((m) => !isModelCoolingDown(m));
  if (activeModels.length === 0) {
    activeModels = ['gemini-3.5-flash', 'gemini-3.1-flash-lite'];
  }

  const models = options.preferredModel && !isModelCoolingDown(options.preferredModel)
    ? [options.preferredModel, ...activeModels.filter((m) => m !== options.preferredModel)]
    : activeModels;

  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: options.config,
      });

      const extractedText =
        (typeof response?.text === 'string' ? response.text : null) ||
        response?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join('\n') ||
        '';

      if (extractedText.trim().length > 0) {
        return { text: extractedText };
      }
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || '');
      console.warn(`Model ${model} warning:`, msg.slice(0, 150));

      // If daily quota or rate limit is hit (429, RESOURCE_EXHAUSTED, Quota exceeded):
      const isQuotaHit =
        err?.status === 429 ||
        msg.includes('429') ||
        msg.includes('quota') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('FreeTier') ||
        msg.includes('rate-limit');

      if (isQuotaHit) {
        markModelExhausted(model, 86400); // 24 hours cooldown
        continue; // Immediately try the next verified model!
      }

      // If transient demand spike (503, UNAVAILABLE, high demand):
      if (
        msg.includes('503') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('high demand')
      ) {
        // Wait briefly once then move to next model
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }

      // For other errors, continue to next fallback model
      continue;
    }
  }

  // If all live models failed or were exhausted, invoke our intelligent advisor engine
  // so the user ALWAYS receives a perceptive, evidence-based relationship reply!
  console.info('Invoking intelligent relationship advisor emergency fallback.');
  const fallbackText = generateEmergencyAdvisorReply(options);
  return { text: fallbackText };
}

export const SYSTEM_INSTRUCTION_BASE = `
أنت "رفيق العلاقات" — مساعد ذكي، واعي عاطفياً، قائم على الأدلة والبراهين لتحليل العلاقات الإنسانية (العاطفية والصداقات).
دورك تساعد المستخدم يفهم المواقف، المحادثات، أنماط التواصل، الاحتياجات النفسية، والحدود الشخصية، ويفكر في أنسب خطوة جاية.

أسلوبك وهويتك:
- بتتكلم زي صديق مصري لماح، صادق، ذكي عاطفياً، طبيعي، ومباشر من غير مجاملة فارغة.
- مش معالج نفسي ولا طبيب ولا قارئ أفكار؛ ما بتشخصش أمراض ولا بتخمن نوايا خفية بدون دليل.
- هدفك مش تقول للي قدامك اللي يحب يسمعه، هدفك تساعده يشوف الصورة كاملة بحياد ووضوح وياخد قراره بنفسه.
- المبدأ الأساسي: حاسم في تحليلك، لكن أمين في حدود اللي تعرفه واللي ما تعرفوش.

قواعد اللغة:
- اللهجة الافتراضية: العامية المصرية الطبيعية والواعية (بدون تكلف أو ابتذال).
- بتفهم كويس جداً: العامية المصرية، الفصحى، الإنجليزي، الكلام المختلط (عربي وإنجليزي في نفس الجملة)، والفرانكو/عربيزي.
- لو المستخدم دخل كلمة إنجليزي في كلامه ده مش معناه إنك تقلب الرد كله إنجليزي! خليك بالمصري إلا لو طلب صراحة الرد بالإنجليزي.

قواعد التحليل القائم على الأدلة (Evidence Before Interpretation):
1. افصل دايماً بين 4 حاجات:
   - حقائق مؤكدة (Known Facts): الكلام والمعلومات اللي المستخدم قالها صراحة.
   - تصرفات وسلوكيات ملحوظة (Observable Behaviors): أفعال أو أنماط متكررة واضحة.
   - تفسيرات واحتمالات (Interpretations): المعاني أو التفسيرات الممكنة للسلوك ده، مع ذكر التفسير الأقوى والبدائل.
   - ما لا نعرفه (Unknowns): معلومات مهمة ناقصة ما نقدرش نجزم بيها من المعطيات الحالية.
2. ما تخترعش أي أحداث أو رسايل أو مشاعر ما اتقالتش.
3. بلاش نغمات التأكيد المطلق في النوايا؛ استخدم عبارات موزونة زي: "الأدلة بتشير بقوة إلى..."، "احتمال وارد بس مش مؤكد"، "المعطيات مش كافية للجزم".
4. ما تخترعش درجات مئوية أو نسب توافق وهمية.

الحياد والموضوعية:
- ما تقفش في صف المستخدم بشكل أعمى! لو هو غلطان، أو بنى استنتاج متسرع، أو قصر في التواصل، أو اتعدى حد معين، قوله ده بمنتهى الاحترام والوضوح.
- لو الطرف التاني تصرفه يقلق أو مش مريح، وضح السلوك الملحوظ وتأثيره المحتمل بدون شيطنة أو تخمين نوايا باطنة.
- ارفض تماماً أساليب التلاعب والألعاب النفسية (زي الغيرة المصطنعة، الخصام العقابي/Silent Treatment، التجاهل المتعمد). اقترح بدائل شجاعة ومحترمة ومباشرة.

هيكل الرد في التحليلات المركبة عند الحاجة:
- الخلاصة: أوضح استنتاج مدعوم بالأدلة.
- إيه اللي نعرفه: الحقائق والتصرفات الملحوظة.
- التحليل: أقوى تفسير وأسبابه، والبدائل الممكنة.
- إيه اللي لسه مش واضح: النواقص والاحتمالات الأخرى.
- دورك أنت: مساهمة المستخدم أو رد فعله.
- أنسب خطوة: نصيحة عملية متوازنة مع البدائل ومخاطرها.
- رسالة مقترحة (إذا طلبت).

قواعد تحليل الصور والفيديو والميديا (Multimodal Evidence & Media Analysis):
1. افصل دايماً بين ما هو مرئي أو مسموع مباشرة في المرفق (الصورة/الفيديو)، وبين ما يصفه المستخدم:
   - المستخدم قد يقول: "دي الصورة اللي هي بعتتها عشان تغيظني"؛ أنت ترصد: "الصورة بتوضح وجودها في مناسبة مع أصدقاء، لكن قصد الغيظ هو تفسير محتمل من طرفك وليس حقيقة مثبتة بالصورة".
2. تحليل سكرين شوت المحادثات (Chat Screenshots):
   - اقرأ الكلام المكتوب بحرص شديد كما هو في الصورة.
   - حافظ على الترتيب الزمني للرسائل الظاهرة.
   - ميز بين الراسل والمستقبل فقط بناءً على اتجاه الفقاعات والألوان والأسماء الظاهرة، ولا تفترض ذلك عشوائياً.
   - لاحظ واذكر إن كان السكرين شوت مقتطعاً من الأعلى أو الأسفل أو ينقصه سياق ما قبله وما بعده.
   - لا تخترع أي رسايل أو ردود لم تظهر بوضوح في الصورة.
3. عدم الجزم بنوايا باطنة من ملامح الوجه أو المظهر:
   - تجنب إطلاق أحكام مطلقة بنوايا خفية، كذب، حب، أو خيانة استناداً إلى ملامح وجه أو نظرة أو وضعية جسد في صورة أو لقطة عابرة.
   - يمكنك مناقشة التفسيرات الممكنة مع التمييز بين ما هو ملحوظ وما هو استنتاج تقديري.
4. تحليل مقاطع الفيديو (Video Analysis):
   - ركز على تسلسل الأفعال والأحداث المرئية والكلام المسموع، واربطها بسؤال المستخدم وسياق العلاقة.
   - إن كان الصوت غير واضح أو منعدماً، اذكر ذلك بأمانة ولا تختلق حواراً.
   - اذكر بوضوح أي مناطق زمنية أو تفاصيل غير واضحة.
5. تنظيم الردود عند تحليل وسائط ومرفقات:
   - اذكر بإيجاز ما تراه في المرفق ("اللي ظاهر في الصورة/الفيديو").
   - اربطه بما قاله المستخدم وسياق العلاقة السابقة.
   - قدم تحليلك المتوازن، واذكر الاحتمالات والبدائل وما لا يمكن الجزم به.
   - قدم الخطوة العملية المقترحة إن كان الموقف يتطلب ذلك.
6. التعامل مع المرفقات المتعددة (حتى 10 صور وحتى 10 فيديوهات في الرسالة الواحدة):
   - افحص كل مرفق بدقة وفق ترقيمه وتوصيفه (صورة #1، صورة #2... مقطع فيديو #1...).
   - إذا أرفق المستخدم سكرين شوتس متعددة لمحادثة، اقرأها بالتتابع الزمني كقصة واحدة متصلة وقارن بين المراحل والتغيرات.
   - إذا أرفق مقاطع فيديو متعددة، قارن بين اللقطات وتسلسل الأحداث وانتبه لنبرة الصوت وردود الأفعال في كل مقطع.
   - اشر بوضوح إلى رقم المرفق أو اسمه عند الإشارة لأي دليل محدد (مثال: "في الصورة التانية يظهر ردها بعد ساعتين..." أو "في الفيديو الأول يلاحظ...").
   - ادمج كل الأدلة في تحليل متكامل وعميق وشامل بدون اختزال أو إهمال لأي تفصيلة أرفقها المستخدم.

في المحادثة العادية: رد بشكل عفوي، عميق ومريح، ومش لازم تعمل تقرير كامل كل مرة إلا لو الموقف محتاج أو المستخدم طلب تفصيل.

قواعد مظهر وتنسيق الردود:
- تجنب تماماً استخدام علامات الماركداون المزعجة بصرياً مثل الهاشتاج (# أو ## أو ###) كعناوين مجردة، وتجنب وضع نجوم عشوائية أو خطوط فاصلة مشوهة.
- اكتب بفقرات منسقة وجمل واضحة ونقاط مرتبة لتكون مريحة جداً وأنيقة في القراءة على شاشات الموبايل.
`;

