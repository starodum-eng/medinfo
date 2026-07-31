// supabase/functions/process-document/index.ts
// Распознавание анализа: фото -> Gemini Flash -> lab_results + red_flags.
// БЕЗОПАСНОСТЬ: не диагностируем, не успокаиваем в обход врача,
// не назначаем лечение/диету. Критические значения -> обязательный urgent-флаг.

import { createClient } from "npm:@supabase/supabase-js@2";

// Кандидаты flash-моделей: берётся первая рабочая. Так депрекейт одной модели
// не ломает распознавание. Точную модель можно задать секретом GEMINI_MODEL.
const DEFAULT_GEMINI_MODELS = [
  "gemini-flash-latest",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
];
const GEMINI_URL = (model: string, key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EXTRACTION_PROMPT = `
Ты аккуратно переносишь данные бумажного медицинского анализа в структуру.
Ты НЕ врач. Соблюдай правила строго.

ЧТО ДЕЛАТЬ:
- На фото бланк лабораторного анализа (кровь, моча, биохимия и т.п.).
  Извлеки каждый показатель: название, значение, единицу, референсный интервал
  (нижняя и верхняя границы), если они есть на бланке.
- Нормализуй название показателя на русском (например "HGB" -> "Гемоглобин").
- Определи флаг относительно референса: normal, low, high,
  critical_low / critical_high (сильное, потенциально опасное отклонение), unknown.
- Для каждого показателя дай короткое объяснение простым русским языком
  (1-2 предложения): что этот показатель отражает. БЕЗ диагноза.
- Если значение не число ("отрицательно", "следы") — положи его в value_text,
  а value оставь null.
- Извлеки дату сдачи (taken_at) в формате ГГГГ-ММ-ДД, если она есть.
- Если на фото НЕ бланк числового анализа — верни doc_type "unknown" и пустой
  список results.

СТРОГИЕ ЗАПРЕТЫ:
- НЕ ставь диагнозов, не называй болезни.
- НЕ успокаивай, не пиши "всё хорошо, к врачу не нужно".
- НЕ назначай лечение, лекарства, диету.
- Не нагнетай и не пугай. Тон спокойный, нейтральный, поддерживающий.

КРАСНЫЕ ФЛАГИ:
- Значения со значительным/опасным отклонением (critical_low/critical_high) ->
  добавь в red_flags объект severity "urgent" и короткую нейтральную причину,
  ПОЧЕМУ стоит показать врачу (без диагноза). Умеренные отклонения -> "warn".

overall_note — 1-2 предложения нейтрального комментария (напр. "часть показателей
вне референсных значений, их стоит обсудить с врачом"), без диагноза.

Верни СТРОГО JSON по схеме, без markdown и текста вокруг:
{
  "doc_type": "lab_numeric" | "unknown",
  "taken_at": "ГГГГ-ММ-ДД" | null,
  "lab_name": строка | null,
  "results": [{
    "analyte_name": строка,
    "value": число | null,
    "value_text": строка | null,
    "unit": строка | null,
    "ref_low": число | null,
    "ref_high": число | null,
    "flag": "normal"|"low"|"high"|"critical_low"|"critical_high"|"unknown",
    "explanation": строка
  }],
  "overall_note": строка,
  "red_flags": [{ "severity": "warn"|"urgent", "message": строка }]
}
`.trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  // Ключ клиента функции: сначала авто-инжектируемый платформой SUPABASE_ANON_KEY
  // (всегда валиден), иначе — заданный вручную APP_SUPABASE_ANON_KEY (publishable).
  // Так "Invalid API key" из-за незаданного/неверного секрета не воспроизводится.
  const anonKey =
    Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("APP_SUPABASE_ANON_KEY") ?? "";
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  const authHeader = req.headers.get("Authorization") ?? "";

  // клиент под RLS: пробрасываем JWT пользователя -> доступ только к своим данным
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  let documentId: string | null = null;

  try {
    if (!anonKey) {
      return json({ error: "Ключ Supabase не найден (SUPABASE_ANON_KEY/APP_SUPABASE_ANON_KEY)" }, 500);
    }
    if (!geminiKey) return json({ error: "GEMINI_API_KEY не задан в секретах функции" }, 500);

    // Токен пользователя берём явно из заголовка и валидируем через getUser(token).
    // Без аргумента getUser() ищет сохранённую сессию (её в функции нет) -> 401.
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return json(
        { error: "Не авторизован (getUser): " + (userErr?.message ?? "нет пользователя") },
        401,
      );
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    documentId = body.document_id ?? null;
    if (!documentId) return json({ error: "document_id обязателен" }, 400);

    const { data: doc, error: docErr } = await supabase
      .from("documents").select("id, storage_path").eq("id", documentId).single();
    if (docErr || !doc?.storage_path) return json({ error: "Документ не найден" }, 404);

    const { data: file, error: dlErr } = await supabase.storage
      .from("documents").download(doc.storage_path);
    if (dlErr || !file) throw new Error("Не удалось скачать файл из хранилища");

    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    const base64 = btoa(binary);
    const mime = doc.storage_path.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";

    // generationConfig собираем под конкретную модель. Для 2.5-flash выключаем
    // thinking (thinkingBudget: 0), иначе «размышления» съедают лимит токенов и
    // до самих показателей ответа не остаётся. У 2.0-flash thinkingConfig нет.
    const buildBody = (model: string) => {
      const generationConfig: Record<string, unknown> = {
        responseMimeType: "application/json",
        temperature: 0.1,
        maxOutputTokens: 32768,
      };
      if (!model.includes("2.0")) {
        generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }
      return JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { text: EXTRACTION_PROMPT },
            { inlineData: { mimeType: mime, data: base64 } },
          ],
        }],
        generationConfig,
      });
    };

    // Перебираем модели: первая ответившая 200 — рабочая. 404 (модель недоступна)
    // -> пробуем следующую; иная ошибка -> сразу наверх с деталями.
    const envModel = Deno.env.get("GEMINI_MODEL");
    const models = envModel ? [envModel] : DEFAULT_GEMINI_MODELS;
    let geminiResp: Response | null = null;
    let usedModel = "";
    const tried: string[] = [];
    for (const model of models) {
      const resp = await fetch(GEMINI_URL(model, geminiKey), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: buildBody(model),
      });
      if (resp.ok) {
        geminiResp = resp;
        usedModel = model;
        break;
      }
      const t = await resp.text();
      tried.push(`${model} -> ${resp.status}`);
      // 404 = модель не найдена/недоступна: пробуем следующую. Иначе — стоп.
      if (resp.status !== 404) {
        throw new Error(`Gemini ${resp.status} (${model}): ${t.slice(0, 300)}`);
      }
    }
    if (!geminiResp) {
      throw new Error(`Ни одна модель Gemini недоступна: ${tried.join("; ")}`);
    }

    const gJson = await geminiResp.json();
    const candidate = gJson?.candidates?.[0];
    const finishReason: string = candidate?.finishReason ?? "";
    // Текст может прийти несколькими частями — склеиваем все.
    const rawText: string = (candidate?.content?.parts ?? [])
      .map((p: any) => p?.text ?? "")
      .join("");

    let parsed: any = {};
    try {
      parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim() || "{}");
    } catch (_e) {
      throw new Error(
        `Модель вернула не-JSON (finishReason=${finishReason}, model=${usedModel}): ` +
          rawText.slice(0, 300),
      );
    }

    const results = Array.isArray(parsed.results) ? parsed.results : [];
    let redFlags = Array.isArray(parsed.red_flags) ? parsed.red_flags : [];
    const takenAt = parsed.taken_at ?? null;
    const docType = parsed.doc_type === "lab_numeric" ? "lab_numeric" : "unknown";
    const validFlags = ["normal","low","high","critical_low","critical_high","unknown"];

    // Детерминированная страховка: критические значения обязаны дать urgent-флаг
    const hasCritical = results.some((r: any) => r.flag === "critical_low" || r.flag === "critical_high");
    const hasUrgent = redFlags.some((f: any) => f.severity === "urgent");
    if (hasCritical && !hasUrgent) {
      redFlags = [{
        severity: "urgent",
        message: "Обнаружены значения со значительным отклонением от нормы. Обязательно покажите этот анализ врачу.",
      }, ...redFlags];
    }

    // Идемпотентность повторной обработки
    await supabase.from("lab_results").delete().eq("document_id", documentId);
    await supabase.from("red_flags").delete().eq("document_id", documentId);

    if (results.length) {
      const rows = results.map((r: any) => ({
        document_id: documentId, user_id: userId,
        analyte_name: String(r.analyte_name ?? "").slice(0, 200) || "—",
        analyte_code: r.analyte_code ?? null,
        value: typeof r.value === "number" ? r.value : null,
        value_text: r.value_text ?? null,
        unit: r.unit ?? null,
        ref_low: typeof r.ref_low === "number" ? r.ref_low : null,
        ref_high: typeof r.ref_high === "number" ? r.ref_high : null,
        flag: validFlags.includes(r.flag) ? r.flag : "unknown",
        explanation: r.explanation ?? null,
        measured_at: takenAt,
      }));
      const { error: insErr } = await supabase.from("lab_results").insert(rows);
      if (insErr) throw new Error("Запись результатов: " + insErr.message);
    }

    if (redFlags.length) {
      const rows = redFlags.map((f: any) => ({
        user_id: userId, document_id: documentId,
        severity: f.severity === "urgent" ? "urgent" : "warn",
        message: String(f.message ?? "").slice(0, 500),
      }));
      await supabase.from("red_flags").insert(rows);
    }

    const { error: updErr } = await supabase
      .from("documents")
      .update({ status: "processed", taken_at: takenAt, doc_type: docType })
      .eq("id", documentId);
    if (updErr) throw new Error("Обновление документа: " + updErr.message);

    return json({
      ok: true,
      results_count: results.length,
      red_flags_count: redFlags.length,
      // Диагностика (видна в консоли клиента): если показателей 0 — здесь причина.
      debug: {
        model: usedModel,
        doc_type: docType,
        finish_reason: finishReason,
        overall_note: parsed.overall_note ?? null,
        raw_preview: rawText.slice(0, 400),
      },
    });
  } catch (e) {
    if (documentId) {
      await supabase.from("documents").update({ status: "failed" }).eq("id", documentId);
    }
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
