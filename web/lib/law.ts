// Sahayak's knowledge: the laws and helplines it may cite. The model can only point at these by id
// (the response schema enforces it), and the cards she reads show this text, not the model's.
// Summaries are plain English and deliberately cautious: "up to", "may", never a promised outcome.
// Bharatiya Nyaya Sanhita (BNS) and Bharatiya Nagarik Suraksha Sanhita (BNSS) replaced the IPC and CrPC
// on 1 July 2024; the old IPC numbers are given because people and police still use them.
import type { Language } from "./local";

export interface Law {
  id: string;
  act: string;
  section: string;
  title: Record<Language, string>;
  summary: string;
}

export const LAWS: Law[] = [
  // Criminal law: BNS
  {
    id: "bns74",
    act: "BNS",
    section: "Section 74 (old IPC 354)",
    title: { en: "Assault to outrage a woman’s modesty", bn: "নারীর শ্লীলতাহানির উদ্দেশ্যে আক্রমণ", hi: "स्त्री की लज्जा भंग करने के इरादे से हमला" },
    summary:
      "Using force on a woman, or assaulting her, intending or knowing it will outrage her modesty: for example groping or grabbing. Punishable with 1 to 5 years in prison and a fine.",
  },
  {
    id: "bns75",
    act: "BNS",
    section: "Section 75 (old IPC 354A)",
    title: { en: "Sexual harassment", bn: "যৌন হয়রানি", hi: "यौन उत्पीड़न" },
    summary:
      "Unwelcome physical contact and advances, demanding or asking for sexual favours, showing pornography against her will, or making sexually coloured remarks. Up to 3 years for the first three; up to 1 year for remarks; with or without a fine.",
  },
  {
    id: "bns76",
    act: "BNS",
    section: "Section 76 (old IPC 354B)",
    title: { en: "Assault to disrobe a woman", bn: "নারীকে বিবস্ত্র করার উদ্দেশ্যে আক্রমণ", hi: "स्त्री को निर्वस्त्र करने के इरादे से हमला" },
    summary: "Assaulting or using force on a woman intending to disrobe her or force her to be naked. 3 to 7 years in prison and a fine.",
  },
  {
    id: "bns77",
    act: "BNS",
    section: "Section 77 (old IPC 354C)",
    title: { en: "Voyeurism", bn: "গোপনে দেখা বা ছবি তোলা (ভয়্যারিজম)", hi: "ताक-झाँक (वॉयरिज़्म)" },
    summary:
      "Watching or capturing images of a woman in a private act where she expects not to be seen, or sharing such images. Sharing applies even if she agreed to the picture but not to it being shared. 1 to 3 years for a first conviction, 3 to 7 years after that, and a fine.",
  },
  {
    id: "bns78",
    act: "BNS",
    section: "Section 78 (old IPC 354D)",
    title: { en: "Stalking, including online", bn: "পিছু নেওয়া, অনলাইনেও (স্টকিং)", hi: "पीछा करना, ऑनलाइन भी (स्टॉकिंग)" },
    summary:
      "Following a woman or repeatedly contacting her despite her clear lack of interest, or monitoring her use of the internet, email or other electronic communication. Up to 3 years for a first conviction and up to 5 years after that, with a fine.",
  },
  {
    id: "bns79",
    act: "BNS",
    section: "Section 79 (old IPC 509)",
    title: { en: "Words or gestures to insult a woman’s modesty", bn: "নারীর শ্লীলতা অপমানের উদ্দেশ্যে কথা বা অঙ্গভঙ্গি", hi: "स्त्री की लज्जा का अपमान करने वाले शब्द या इशारे" },
    summary:
      "Saying words, making sounds or gestures, or showing an object intending her to hear or see it and insult her modesty, or intruding on her privacy. Up to 3 years in prison and a fine.",
  },
  {
    id: "bns64",
    act: "BNS",
    section: "Sections 63–64 (old IPC 375–376)",
    title: { en: "Rape", bn: "ধর্ষণ", hi: "बलात्कार" },
    summary:
      "Sexual acts without her consent, or with consent obtained by fear or deception, or when she cannot consent (for example when intoxicated or under 18). At least 10 years and up to life imprisonment, and a fine. Her statement should be recorded by a woman officer, and every hospital must treat her free of charge.",
  },
  {
    id: "bns69",
    act: "BNS",
    section: "Section 69",
    title: { en: "Sex by deceit or a false promise of marriage", bn: "প্রতারণা বা বিয়ের মিথ্যা প্রতিশ্রুতিতে যৌন সম্পর্ক", hi: "धोखे या शादी के झूठे वादे से यौन संबंध" },
    summary:
      "Having sexual intercourse with a woman through deceit, or by promising to marry her with no intention of keeping the promise. Up to 10 years in prison and a fine.",
  },
  {
    id: "bns85",
    act: "BNS",
    section: "Sections 85–86 (old IPC 498A)",
    title: { en: "Cruelty by a husband or his relatives", bn: "স্বামী বা শ্বশুরবাড়ির নিষ্ঠুরতা", hi: "पति या ससुराल वालों द्वारा क्रूरता" },
    summary:
      "A husband or his relatives treating a woman with cruelty: conduct likely to drive her to suicide or to cause grave injury or danger to her life or health, mental or physical, or harassing her to meet demands for money or property such as dowry. Up to 3 years in prison and a fine.",
  },
  {
    id: "bns80",
    act: "BNS",
    section: "Section 80 (old IPC 304B)",
    title: { en: "Dowry death", bn: "পণের জন্য মৃত্যু", hi: "दहेज मृत्यु" },
    summary:
      "A woman’s death by burns, injury or in unnatural circumstances within seven years of marriage, where she was harassed for dowry soon before. At least 7 years and up to life imprisonment.",
  },
  {
    id: "bns115",
    act: "BNS",
    section: "Sections 115–118 (old IPC 323–326)",
    title: { en: "Hurt and grievous hurt", bn: "আঘাত ও গুরুতর আঘাত", hi: "चोट और गंभीर चोट" },
    summary:
      "Causing bodily pain, disease or injury. Simple hurt is punishable with up to 1 year or a fine; grievous hurt (fractures, serious injury) and hurt with weapons carry much longer sentences. A medical examination soon after helps prove it.",
  },
  {
    id: "bns351",
    act: "BNS",
    section: "Section 351 (old IPC 503/506)",
    title: { en: "Criminal intimidation (threats)", bn: "ভয় দেখানো (হুমকি)", hi: "आपराधिक धमकी" },
    summary:
      "Threatening injury to her body, reputation or property, or to someone she cares about, to make her do or stop doing something. Up to 2 years; up to 7 years if the threat is of death, grievous hurt, or imputing unchastity to a woman.",
  },
  {
    id: "bns308",
    act: "BNS",
    section: "Section 308 (old IPC 384)",
    title: { en: "Extortion, including sextortion", bn: "জবরদস্তি আদায়, ছবি দিয়ে ব্ল্যাকমেলও", hi: "जबरन वसूली, तस्वीरों से ब्लैकमेल भी" },
    summary:
      "Putting someone in fear of injury, including of being exposed with photos or videos, to make them hand over money, property or something of value. Up to 7 years in prison, or a fine, or both.",
  },
  {
    id: "bns356",
    act: "BNS",
    section: "Section 356 (old IPC 499/500)",
    title: { en: "Defamation", bn: "মানহানি", hi: "मानहानि" },
    summary:
      "Making or publishing statements or images meant to harm her reputation. Up to 2 years in prison, or a fine, or both, or community service. Often filed alongside IT Act offences when morphed pictures are spread.",
  },

  // Procedure: BNSS
  {
    id: "bnss173",
    act: "BNSS",
    section: "Section 173",
    title: { en: "FIR, Zero FIR and e-FIR", bn: "এফআইআর, জিরো এফআইআর ও ই-এফআইআর", hi: "एफ़आईआर, ज़ीरो एफ़आईआर और ई-एफ़आईआर" },
    summary:
      "Police must register an FIR for a cognizable offence. It can be filed at any police station, whatever the place of the offence (Zero FIR), and can be given electronically, to be signed within three days. A woman reporting sexual offences (BNS 64–71, 74–79) has her statement recorded by a woman officer. She gets a free copy of the FIR. If the officer refuses, she can send it in writing to the Superintendent of Police.",
  },
  {
    id: "bnss175",
    act: "BNSS",
    section: "Section 175(3)",
    title: { en: "When police won’t act: the Magistrate", bn: "পুলিশ ব্যবস্থা না নিলে: ম্যাজিস্ট্রেট", hi: "पुलिस कार्रवाई न करे तो: मजिस्ट्रेट" },
    summary:
      "If the police refuse to register or investigate, and a complaint to the Superintendent of Police has not helped, she can apply to a Magistrate, who can order the police to investigate.",
  },

  // Domestic violence
  {
    id: "dv3",
    act: "Protection of Women from Domestic Violence Act, 2005",
    section: "Section 3",
    title: { en: "What counts as domestic violence", bn: "গার্হস্থ্য হিংসা কাকে বলে", hi: "घरेलू हिंसा किसे कहते हैं" },
    summary:
      "Physical, sexual, verbal and emotional, and economic abuse by someone she lives or lived with in a shared household: husband, live-in partner, or relatives. Insults, threats, stopping her from working or taking her money all count. This is a civil law for protection and relief; it can be used alongside a criminal case or on its own.",
  },
  {
    id: "dv12",
    act: "Protection of Women from Domestic Violence Act, 2005",
    section: "Sections 9, 10, 12",
    title: { en: "How to apply: Protection Officer or Magistrate", bn: "কীভাবে আবেদন করবেন: প্রোটেকশন অফিসার বা ম্যাজিস্ট্রেট", hi: "आवेदन कैसे करें: संरक्षण अधिकारी या मजिस्ट्रेट" },
    summary:
      "She, or someone on her behalf, can approach the Protection Officer of her district, a registered service provider (NGO), the police, or directly the Magistrate. The Protection Officer helps record a Domestic Incident Report, arrange shelter and medical help, and file the application. Legal aid is free.",
  },
  {
    id: "dv18",
    act: "Protection of Women from Domestic Violence Act, 2005",
    section: "Sections 17–23",
    title: { en: "Protection, residence and money orders", bn: "সুরক্ষা, বাসস্থান ও আর্থিক সাহায্যের আদেশ", hi: "संरक्षण, निवास और आर्थिक सहायता के आदेश" },
    summary:
      "The Magistrate can order him to stop the violence and stay away (protection order), let her keep living in the shared household and stop him throwing her out (residence order), pay her expenses, medical costs and maintenance (monetary relief), give her temporary custody of the children, and pay compensation. Urgent interim orders can be made, even before he is heard.",
  },

  // Workplace
  {
    id: "posh",
    act: "Sexual Harassment of Women at Workplace Act, 2013 (POSH)",
    section: "Sections 2, 4, 6, 9",
    title: { en: "Harassment at work: the Internal Committee", bn: "কর্মক্ষেত্রে হয়রানি: ইন্টারনাল কমিটি", hi: "कार्यस्थल पर उत्पीड़न: आंतरिक समिति" },
    summary:
      "Every employer with 10 or more workers must have an Internal Committee. If there are fewer, or the complaint is against the employer, she complains to the Local Committee set up by the District Officer. It covers every kind of workplace, including homes for domestic workers. The written complaint should be made within 3 months of the incident (or the last one); the committee can extend this by 3 more months for good reason.",
  },
  {
    id: "posh12",
    act: "Sexual Harassment of Women at Workplace Act, 2013 (POSH)",
    section: "Sections 11–13",
    title: { en: "What the committee must do", bn: "কমিটির যা করা উচিত", hi: "समिति को क्या करना होगा" },
    summary:
      "The committee must finish its inquiry within 90 days. While it runs, she can ask for interim relief such as a transfer for either person or paid leave. The employer must act on its findings within 60 days. She can also file a police complaint at the same time.",
  },

  // Online
  {
    id: "it66e",
    act: "Information Technology Act, 2000",
    section: "Section 66E",
    title: { en: "Violating privacy with images", bn: "ছবির মাধ্যমে গোপনীয়তা লঙ্ঘন", hi: "तस्वीरों से निजता का उल्लंघन" },
    summary:
      "Capturing, publishing or sending images of a person’s private area without consent, where they expect privacy. Up to 3 years in prison, or a fine of up to ₹2 lakh, or both.",
  },
  {
    id: "it67",
    act: "Information Technology Act, 2000",
    section: "Sections 67, 67A",
    title: { en: "Publishing obscene or sexual material online", bn: "অনলাইনে অশ্লীল বা যৌন ছবি ছড়ানো", hi: "ऑनलाइन अश्लील या यौन सामग्री फैलाना" },
    summary:
      "Publishing or sending obscene material electronically (Section 67: up to 3 years and a fine for a first conviction), or sexually explicit material (Section 67A: up to 5 years and a fine of up to ₹10 lakh for a first conviction). Morphed pictures that are shared fall here.",
  },
  {
    id: "it66c",
    act: "Information Technology Act, 2000",
    section: "Sections 66C, 66D",
    title: { en: "Fake profiles and impersonation", bn: "ভুয়ো প্রোফাইল ও ছদ্মবেশ", hi: "फ़र्ज़ी प्रोफ़ाइल और नकल" },
    summary:
      "Using someone’s identity, photos or password (66C), or cheating by pretending to be someone else using a phone or computer (66D). Up to 3 years in prison and a fine of up to ₹1 lakh.",
  },
  {
    id: "itrules",
    act: "IT (Intermediary Guidelines) Rules, 2021",
    section: "Rule 3(2)(b)",
    title: { en: "Getting intimate or morphed images taken down", bn: "অন্তরঙ্গ বা মর্ফ করা ছবি সরানো", hi: "निजी या मॉर्फ़ की गई तस्वीरें हटवाना" },
    summary:
      "Platforms must remove content showing her private parts, nudity or sexual acts, or morphed or impersonating images of her, within a short deadline (counted in hours) after she or someone for her complains through the platform’s grievance channel. She does not need a police case first. Keep a sealed copy of the post before reporting it.",
  },

  // Children
  {
    id: "pocso",
    act: "Protection of Children from Sexual Offences Act, 2012 (POCSO)",
    section: "Sections 19–24",
    title: { en: "If she is under 18", bn: "বয়স ১৮-র কম হলে", hi: "अगर उम्र 18 से कम है" },
    summary:
      "Any sexual offence against a child under 18 falls under POCSO, with stricter punishment. Anyone who knows of it must report it to the police or the Special Juvenile Police Unit. The child’s identity must be kept secret, and her statement is recorded at a place of her choosing, by a woman officer where possible. Childline 1098 can help, day or night.",
  },

  // Evidence
  {
    id: "bsa63",
    act: "Bharatiya Sakshya Adhiniyam, 2023",
    section: "Section 63",
    title: { en: "Using recordings and screenshots in court", bn: "আদালতে রেকর্ডিং ও স্ক্রিনশট ব্যবহার", hi: "अदालत में रिकॉर्डिंग और स्क्रीनशॉट का उपयोग" },
    summary:
      "Electronic records such as videos, audio, photos and chats are admissible as evidence with a certificate under Section 63(4), giving details of the device and the file’s hash value. Saakshi prepares this certificate for anything she has sealed; she completes and signs it.",
  },
];

export interface Helpline {
  id: string;
  number: string; // for tel: or a web address
  web?: boolean;
  name: Record<Language, string>;
}

export const HELPLINES: Helpline[] = [
  { id: "h112", number: "112", name: { en: "Emergency (police, ambulance)", bn: "জরুরি (পুলিশ, অ্যাম্বুলেন্স)", hi: "आपातकाल (पुलिस, एम्बुलेंस)" } },
  { id: "h181", number: "181", name: { en: "Women Helpline, One Stop Centres", bn: "মহিলা হেল্পলাইন, ওয়ান স্টপ সেন্টার", hi: "महिला हेल्पलाइन, वन स्टॉप सेंटर" } },
  { id: "h1930", number: "1930", name: { en: "Cyber crime helpline", bn: "সাইবার অপরাধ হেল্পলাইন", hi: "साइबर अपराध हेल्पलाइन" } },
  { id: "hcyber", number: "https://cybercrime.gov.in", web: true, name: { en: "Report online abuse (cybercrime.gov.in)", bn: "অনলাইন হয়রানির অভিযোগ (cybercrime.gov.in)", hi: "ऑनलाइन उत्पीड़न की शिकायत (cybercrime.gov.in)" } },
  { id: "hncw", number: "7827170170", name: { en: "National Commission for Women (WhatsApp)", bn: "জাতীয় মহিলা কমিশন (হোয়াটসঅ্যাপ)", hi: "राष्ट्रीय महिला आयोग (व्हाट्सऐप)" } },
  { id: "h15100", number: "15100", name: { en: "Free legal aid (NALSA)", bn: "বিনামূল্যে আইনি সাহায্য (NALSA)", hi: "मुफ़्त कानूनी सहायता (NALSA)" } },
  { id: "h1098", number: "1098", name: { en: "Childline (under 18)", bn: "চাইল্ডলাইন (১৮-র কম)", hi: "चाइल्डलाइन (18 से कम)" } },
  { id: "h14416", number: "14416", name: { en: "Tele-MANAS mental health support", bn: "টেলি-মানস মানসিক স্বাস্থ্য সহায়তা", hi: "टेली-मानस मानसिक स्वास्थ्य सहायता" } },
];

export const LAW_IDS = LAWS.map((l) => l.id);
export const HELPLINE_IDS = HELPLINES.map((h) => h.id);
export const lawById = (id: string) => LAWS.find((l) => l.id === id);
export const helplineById = (id: string) => HELPLINES.find((h) => h.id === id);

/** The knowledge as the model sees it. */
export function knowledgeText(): string {
  const laws = LAWS.map((l) => `[${l.id}] ${l.act}, ${l.section}: ${l.title.en}. ${l.summary}`).join("\n");
  const lines = HELPLINES.map((h) => `[${h.id}] ${h.name.en}: ${h.number}`).join("\n");
  return `LAWS\n${laws}\n\nHELPLINES\n${lines}`;
}
