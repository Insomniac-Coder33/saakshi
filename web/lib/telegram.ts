// Server only. The Telegram bot that carries guardian alerts, and what it says, in her language.
// Guardians are adults she chose, so the bot speaks to them formally (আপনি, आप).
import { createHash } from "node:crypto";
import type { Language } from "./local";

export const BOT_USERNAME = "Saakshi_Guardian_bot";

export function telegramReady(): boolean {
  return !!process.env.TELEGRAM_BOT_TOKEN;
}

/** Telegram echoes this on every webhook call, so only Telegram can reach /api/telegram. */
export function webhookSecret(): string {
  return createHash("sha256").update(`saakshi-webhook:${process.env.TELEGRAM_BOT_TOKEN}`).digest("hex").slice(0, 48);
}

export class TelegramError extends Error {
  constructor(
    public method: string,
    public description: string,
  ) {
    super(`${method}: ${description}`);
  }
}

export async function tg<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; result: T; description?: string };
  if (!json.ok) throw new TelegramError(method, json.description ?? `HTTP ${res.status}`);
  return json.result;
}

export const send = (chatId: number, text: string) => tg<{ message_id: number }>("sendMessage", { chat_id: chatId, text });

/** A message with buttons under it; each button sends its `data` back to the webhook when tapped. */
export const sendButtons = (chatId: number, text: string, buttons: { text: string; data: string }[]) =>
  tg<{ message_id: number }>("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: { inline_keyboard: [buttons.map((b) => ({ text: b.text, callback_data: b.data }))] },
  });

/** Replaces a message's text, which also takes its buttons away. */
export const editText = (chatId: number, messageId: number, text: string) =>
  tg("editMessageText", { chat_id: chatId, message_id: messageId, text });

/** 9:47 pm, on Indian time. */
export function istClock(d = new Date(), lang: Language = "en"): string {
  return d.toLocaleTimeString(lang === "en" ? "en-IN" : `${lang}-IN`, { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

type Vars = { name: string; time: string; code: string };
type Message =
  | "linked"
  | "linkedAnon"
  | "start"
  | "noFix"
  | "duress"
  | "silent"
  | "end"
  | "test"
  | "stopped"
  | "badLink"
  | "onlyAlerts"
  | "recoverAsk"
  | "recoverNoCode"
  | "recoverApproved"
  | "recoverApprovedWait"
  | "recoverDeclined"
  | "recoverClosed"
  | "approve"
  | "decline";

const en: Record<Message, (v: Vars) => string> = {
  linked: ({ name }) =>
    `You’re now ${name}’s guardian on Saakshi.\n\nIf she starts a silent SOS, you’ll get a message here with her live location. Keep this chat private: don’t mention it in front of anyone she might be afraid of.\n\nSend /stop at any time to stop being her guardian.`,
  linkedAnon: () =>
    `You’re now a guardian on Saakshi for the person who sent you this link.\n\nIf she starts a silent SOS, you’ll get a message here with her live location. Keep this chat private: don’t mention it in front of anyone she might be afraid of.\n\nSend /stop at any time to stop being her guardian.`,
  start: ({ name, time }) =>
    `🚨 SOS from ${name}\n\n${name} started a silent SOS at ${time}. Her phone is recording video, sound and location, and every 5 seconds is sealed as evidence.\n\nHer live location is below. If you think she is in danger, call 112 and share it.\n\nThink before calling her phone: someone else may see it.`,
  noFix: () => `Her location isn’t available yet. It will appear here as soon as her phone finds it.`,
  duress: ({ name, time }) =>
    `⚠️ ${name} used her duress PIN at ${time}.\n\nSomeone may have forced her to stop the SOS. To them it looks stopped. It isn’t: her phone is still recording, and her location above is still live.\n\nDon’t call or message her phone. If you think she is in danger, call 112 and share her location.`,
  silent: ({ name, time }) =>
    `📵 ${name}’s phone stopped sending at ${time}.\n\nIt may have been switched off, taken or broken. Everything up to that moment is saved and sealed. Her last known location is the map above.\n\nIf you can’t reach her safely, call 112.`,
  end: ({ name, time }) => `✅ ${name} ended the SOS at ${time}. The recording is saved and sealed.`,
  test: ({ name }) => `This is a test from Saakshi. ${name} is checking that alerts reach you. Nothing has happened.`,
  stopped: () => `You’re no longer a guardian. You won’t get any more alerts.`,
  badLink: () => `This invite link has already been used or has expired. Ask her to send you a new one.`,
  onlyAlerts: () => `This chat only sends alerts. Nothing you write here reaches her.`,
  recoverAsk: ({ name, code }) =>
    `🔑 ${name} is moving Saakshi to a new phone.\n\nThe new phone shows the code ${code}. Approve only if ${name} asked you herself, in person or on a call. If you’re not sure, call her first.\n\nApproving lets that phone into her account. Her recordings still need her PIN to open.`,
  recoverNoCode: () => `That code doesn’t match a request. Codes last 30 minutes, so ask her to check the code on her new phone.`,
  recoverApproved: ({ name }) => `Thank you. You approved moving ${name}’s Saakshi to her new phone.`,
  recoverApprovedWait: ({ name }) => `Thank you. ${name}’s Saakshi opens on her new phone as soon as one more guardian approves.`,
  recoverDeclined: ({ name }) => `You declined. The new phone won’t get ${name}’s Saakshi.`,
  recoverClosed: () => `This request has already been settled or has expired.`,
  approve: () => `Approve`,
  decline: () => `Decline`,
};

const bn: Record<Message, (v: Vars) => string> = {
  linked: ({ name }) =>
    `আপনি এখন সাক্ষী-তে ${name}-এর কাছের মানুষ।\n\nউনি চুপচাপ এসওএস শুরু করলে এখানে ওঁর লাইভ লোকেশনসহ মেসেজ পাবেন। এই চ্যাটটা গোপন রাখুন: যাকে উনি ভয় পান, তার সামনে এর কথা বলবেন না।\n\nযেকোনো সময় /stop পাঠিয়ে সরে যেতে পারেন।`,
  linkedAnon: () =>
    `যিনি আপনাকে এই লিংক পাঠিয়েছেন, আপনি এখন সাক্ষী-তে তাঁর কাছের মানুষ।\n\nউনি চুপচাপ এসওএস শুরু করলে এখানে ওঁর লাইভ লোকেশনসহ মেসেজ পাবেন। এই চ্যাটটা গোপন রাখুন: যাকে উনি ভয় পান, তার সামনে এর কথা বলবেন না।\n\nযেকোনো সময় /stop পাঠিয়ে সরে যেতে পারেন।`,
  start: ({ name, time }) =>
    `🚨 ${name}-এর এসওএস\n\n${name} ${time}-এ চুপচাপ এসওএস শুরু করেছেন। ওঁর ফোন ভিডিও, শব্দ আর লোকেশন রেকর্ড করছে, আর প্রতি ৫ সেকেন্ড প্রমাণ হিসেবে সিল হচ্ছে।\n\nওঁর লাইভ লোকেশন নিচে আছে। বিপদ মনে হলে ১১২-তে ফোন করে লোকেশনটা জানান।\n\nওঁর ফোনে কল করার আগে ভাবুন: অন্য কেউ দেখে ফেলতে পারে।`,
  noFix: () => `ওঁর লোকেশন এখনো পাওয়া যায়নি। ফোন খুঁজে পেলেই এখানে দেখাবে।`,
  duress: ({ name, time }) =>
    `⚠️ ${name} ${time}-এ বিপদের পিন দিয়েছেন।\n\nহয়তো কেউ ওঁকে জোর করে এসওএস বন্ধ করিয়েছে। তার চোখে বন্ধ মনে হচ্ছে, আসলে নয়: ফোন এখনো রেকর্ড করছে, আর ওপরের লোকেশন এখনো লাইভ।\n\nওঁর ফোনে কল বা মেসেজ করবেন না। বিপদ মনে হলে ১১২-তে ফোন করে লোকেশনটা জানান।`,
  silent: ({ name, time }) =>
    `📵 ${time} থেকে ${name}-এর ফোন থেকে আর কিছু আসছে না।\n\nফোনটা হয়তো বন্ধ, কেড়ে নেওয়া বা ভাঙা। তার আগে পর্যন্ত সবকিছু সেভ আর সিল হয়ে আছে। ওপরের ম্যাপে ওঁর শেষ জানা লোকেশন।\n\nনিরাপদে যোগাযোগ করতে না পারলে ১১২-তে ফোন করুন।`,
  end: ({ name, time }) => `✅ ${name} ${time}-এ এসওএস শেষ করেছেন। রেকর্ডিং সেভ আর সিল হয়ে আছে।`,
  test: ({ name }) => `এটা সাক্ষী-র একটা পরীক্ষা। ${name} দেখছেন সতর্কবার্তা আপনার কাছে পৌঁছায় কি না। কিছু ঘটেনি।`,
  stopped: () => `আপনি আর কাছের মানুষ নন। আর কোনো সতর্কবার্তা পাবেন না।`,
  badLink: () => `এই লিংকটা আগেই ব্যবহার হয়েছে বা মেয়াদ শেষ। ওঁকে নতুন একটা পাঠাতে বলুন।`,
  onlyAlerts: () => `এই চ্যাট শুধু সতর্কবার্তা পাঠায়। এখানে লেখা কিছু ওঁর কাছে পৌঁছায় না।`,
  recoverAsk: ({ name, code }) =>
    `🔑 ${name} সাক্ষী নতুন ফোনে নিচ্ছেন।\n\nনতুন ফোনে কোড দেখাচ্ছে ${code}। শুধু তখনই অনুমতি দিন, যদি ${name} নিজে আপনাকে বলে থাকেন, সামনাসামনি বা ফোনে। নিশ্চিত না হলে আগে ওঁকে ফোন করুন।\n\nঅনুমতি দিলে ওই ফোন ওঁর অ্যাকাউন্টে ঢুকতে পারবে। রেকর্ডিং খুলতে তবুও ওঁর পিন লাগবে।`,
  recoverNoCode: () => `এই কোডের কোনো অনুরোধ নেই। কোড ৩০ মিনিট চলে, তাই ওঁকে নতুন ফোনের কোডটা আবার দেখতে বলুন।`,
  recoverApproved: ({ name }) => `ধন্যবাদ। আপনি ${name}-এর সাক্ষী নতুন ফোনে নেওয়ার অনুমতি দিয়েছেন।`,
  recoverApprovedWait: ({ name }) => `ধন্যবাদ। আরেকজন কাছের মানুষ অনুমতি দিলেই ${name}-এর নতুন ফোনে সাক্ষী খুলবে।`,
  recoverDeclined: ({ name }) => `আপনি অনুমতি দেননি। নতুন ফোনটা ${name}-এর সাক্ষী পাবে না।`,
  recoverClosed: () => `এই অনুরোধের নিষ্পত্তি হয়ে গেছে বা মেয়াদ শেষ।`,
  approve: () => `অনুমতি দিন`,
  decline: () => `না`,
};

const hi: Record<Message, (v: Vars) => string> = {
  linked: ({ name }) =>
    `अब आप साक्षी पर ${name} के अपने हैं।\n\nअगर वे चुपचाप एसओएस शुरू करेंगी, तो आपको यहाँ उनकी लाइव लोकेशन के साथ मैसेज मिलेगा। यह चैट गुप्त रखें: जिससे वे डरती हों, उसके सामने इसका ज़िक्र न करें।\n\nकभी भी /stop भेजकर हट सकते हैं।`,
  linkedAnon: () =>
    `जिन्होंने आपको यह लिंक भेजा है, अब आप साक्षी पर उनके अपने हैं।\n\nअगर वे चुपचाप एसओएस शुरू करेंगी, तो आपको यहाँ उनकी लाइव लोकेशन के साथ मैसेज मिलेगा। यह चैट गुप्त रखें: जिससे वे डरती हों, उसके सामने इसका ज़िक्र न करें।\n\nकभी भी /stop भेजकर हट सकते हैं।`,
  start: ({ name, time }) =>
    `🚨 ${name} का एसओएस\n\n${name} ने ${time} पर चुपचाप एसओएस शुरू किया है। उनका फ़ोन वीडियो, आवाज़ और लोकेशन रिकॉर्ड कर रहा है, और हर 5 सेकंड सबूत के तौर पर सील हो रहा है।\n\nउनकी लाइव लोकेशन नीचे है। ख़तरा लगे तो 112 पर फ़ोन करके लोकेशन बताएँ।\n\nउनके फ़ोन पर कॉल करने से पहले सोचें: कोई और देख सकता है।`,
  noFix: () => `उनकी लोकेशन अभी नहीं मिली है। फ़ोन को मिलते ही यहाँ दिखेगी।`,
  duress: ({ name, time }) =>
    `⚠️ ${name} ने ${time} पर ख़तरे का पिन डाला है।\n\nशायद किसी ने उन्हें ज़बरदस्ती एसओएस बंद करवाया है। उसे लगेगा कि बंद हो गया। ऐसा नहीं है: फ़ोन अब भी रिकॉर्ड कर रहा है, और ऊपर की लोकेशन अब भी लाइव है।\n\nउनके फ़ोन पर कॉल या मैसेज न करें। ख़तरा लगे तो 112 पर फ़ोन करके लोकेशन बताएँ।`,
  silent: ({ name, time }) =>
    `📵 ${time} से ${name} के फ़ोन से कुछ नहीं आ रहा।\n\nफ़ोन शायद बंद हो गया, छीन लिया गया या टूट गया। उस पल तक का सब कुछ सेव और सील है। ऊपर के नक़्शे पर उनकी आख़िरी लोकेशन है।\n\nसुरक्षित तरीके से संपर्क न हो पाए तो 112 पर फ़ोन करें।`,
  end: ({ name, time }) => `✅ ${name} ने ${time} पर एसओएस ख़त्म किया। रिकॉर्डिंग सेव और सील है।`,
  test: ({ name }) => `यह साक्षी का एक टेस्ट है। ${name} देख रही हैं कि अलर्ट आप तक पहुँचते हैं या नहीं। कुछ नहीं हुआ है।`,
  stopped: () => `अब आप उनके अपने नहीं हैं। आगे कोई अलर्ट नहीं मिलेगा।`,
  badLink: () => `यह लिंक पहले ही इस्तेमाल हो चुका है या पुराना हो गया है। उनसे नया लिंक भेजने को कहें।`,
  onlyAlerts: () => `यह चैट सिर्फ़ अलर्ट भेजती है। यहाँ लिखी कोई बात उन तक नहीं पहुँचती।`,
  recoverAsk: ({ name, code }) =>
    `🔑 ${name} साक्षी को नए फ़ोन पर ले जा रही हैं।\n\nनए फ़ोन पर कोड ${code} दिख रहा है। अनुमति तभी दें जब ${name} ने ख़ुद आपसे कहा हो, आमने-सामने या फ़ोन पर। पक्का न हो तो पहले उन्हें फ़ोन करें।\n\nअनुमति देने से वह फ़ोन उनके अकाउंट में आ जाएगा। रिकॉर्डिंग खोलने के लिए फिर भी उनका पिन चाहिए।`,
  recoverNoCode: () => `इस कोड का कोई अनुरोध नहीं है। कोड 30 मिनट चलता है, इसलिए उनसे नए फ़ोन पर कोड दोबारा देखने को कहें।`,
  recoverApproved: ({ name }) => `धन्यवाद। आपने ${name} की साक्षी को नए फ़ोन पर ले जाने की अनुमति दी।`,
  recoverApprovedWait: ({ name }) => `धन्यवाद। एक और अपने के अनुमति देते ही ${name} के नए फ़ोन पर साक्षी खुल जाएगी।`,
  recoverDeclined: ({ name }) => `आपने अनुमति नहीं दी। नए फ़ोन को ${name} की साक्षी नहीं मिलेगी।`,
  recoverClosed: () => `इस अनुरोध का फ़ैसला हो चुका है या उसका समय ख़त्म हो गया।`,
  approve: () => `अनुमति दें`,
  decline: () => `मना करें`,
};

const MESSAGES: Record<Language, Record<Message, (v: Vars) => string>> = { en, bn, hi };
const SOMEONE: Record<Language, string> = { en: "Your contact", bn: "আপনার পরিচিত", hi: "आपकी परिचित" };

export function message(lang: Language, key: Message, name: string | null, at = new Date(), code = ""): string {
  const l = MESSAGES[lang] ? lang : "en";
  return MESSAGES[l][key]({ name: name || SOMEONE[l], time: istClock(at, l), code });
}
