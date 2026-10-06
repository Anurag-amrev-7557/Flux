import { NextResponse } from 'next/server';

interface CategoryItem {
    id: string;
    name: string;
}

export const onRequest: PagesFunction = async (context) => {
    const { request, env } = context;

    if (request.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { 'Content-Type': 'application/json' } }
        );
    }

    try {
        const body = await request.json() as { input: string; categories?: CategoryItem[] };
        const { input, categories = [] } = body;

        if (!input || typeof input !== 'string' || !input.trim()) {
            return new Response(
                JSON.stringify({ error: 'Input text is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const apiKey = env.GROQ_API_KEY;

        if (!apiKey) {
            return new Response(
                JSON.stringify({
                    success: false,
                    fallback: true,
                    error: 'Groq API Key not configured on server.',
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const categoryList = (categories)
            .map(c => `- ID: "${c.id}", Name: "${c.name}"`)
            .join('\n');

        const systemPrompt = `You are an elite financial entity extractor and merchant normalizer for a luxury personal finance app.
Analyze the user's natural language input, which may be:
1. Conversational text (e.g. "Dinner with Sarah $45.50", "Yash owes me 500 for concert", "Received salary 4500").
2. Raw bank / card SMS alerts (e.g. "Acct XX4092 debited USD 34.50 at WHOLEFDS MKT*728 on 05-Oct", "INR 450 spent on card ending 8812 at SWIGGY*BLR").
3. Messy transaction statements or receipt lines.

Crucial Merchant Normalization Rule:
Clean messy merchant names into clean, recognizable brand titles (e.g. "AMZN MKTP US*2948" -> "Amazon", "UBER *TRIP PENDING" -> "Uber", "WHOLEFDS MKT" -> "Whole Foods", "SBUX #0921" -> "Starbucks"). Do not leave bank reference codes or asterisks in the note!

Available categories in user's account:
${categoryList || 'None provided'}

Respond with ONLY a raw JSON object with this exact schema:
{
  "amount": number or null,
  "type": "expense" | "income" | "debt",
  "categoryId": string or null (match closely to an available category ID, or null if none fit),
  "categoryName": string or null (the matching category name),
  "note": string (clean, normalized merchant/title, e.g. "Whole Foods", "Dinner with Sarah"),
  "personName": string or null (if someone owes money, lent money, or shared a split, extract their name e.g. "Sarah", "Yash"),
  "isSplit": boolean (true if input indicates splitting a bill),
  "confidence": number between 0.0 and 1.0
}`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'qwen/qwen3.8-27b',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: input }
                ],
                temperature: 0.1,
                response_format: { type: 'json_object' },
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            return new Response(
                JSON.stringify({
                    success: false,
                    fallback: true,
                    error: `Groq API error: ${response.status} ${errText}`
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
            return new Response(
                JSON.stringify({ success: false, fallback: true, error: 'Empty LLM response' }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const parsed = JSON.parse(content);
        return new Response(
            JSON.stringify({ success: true, parsed }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (err: any) {
        return new Response(
            JSON.stringify({
                success: false,
                fallback: true,
                error: err?.message || 'Failed to parse natural language'
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
