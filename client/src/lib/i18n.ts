export const locales = ["en", "hi", "or"] as const;
export type Locale = (typeof locales)[number];

export const localeLabels: Record<Locale, string> = {
  en: "English",
  hi: "हिन्दी",
  or: "ଓଡ଼ିଆ",
};

const translations = {
  en: {
    nav: {
      how: "How It Works",
      capabilities: "Capabilities",
      workers: "For Health Workers",
      safety: "Safety",
      about: "About",
      demo: "View Demo",
      start: "Start Triage",
      menuOpen: "Open menu",
      menuClose: "Close menu",
    },
    hero: {
      eyebrow: "AI-ASSISTED HEALTHCARE TRIAGE",
      title: "Turn patient information",
      accent: "into clearer next steps.",
      body: "SehatSetu AI helps healthcare workers organize symptoms, medical reports, and patient information into structured triage notes for faster, safer human review.",
      start: "Start Triage",
      how: "See How It Works",
      trust: ["Human-reviewed", "Non-diagnostic", "Privacy-first"],
    },
    dashboard: {
      kicker: "TRIAGE ASSISTANT",
      workspace: "Patient review workspace",
      assist: "AI ASSIST",
      input: "PATIENT INPUT",
      synthetic: "SYNTHETIC DATA",
      quote: "“Fever, cough and fatigue for 4 days...”",
      extracted: "EXTRACTED INFORMATION",
      temperature: "TEMPERATURE",
      duration: "DURATION",
      symptoms: "SYMPTOMS",
      days: "4 days",
      missing: "MISSING INFORMATION",
      respiratory: "Respiratory rate",
      needs: "NEEDS REVIEW",
      priority: "REVIEW PRIORITY",
      moderate: "MODERATE",
      flag: "Information-based triage flag",
      next: "RECOMMENDED NEXT STEP",
      review: "Review by qualified healthcare staff",
      suggestion: "AI suggestion",
      decision: "Human decision",
      professional: "Requires professional review",
    },
    trust: {
      title: "BUILT FOR REAL-WORLD HEALTHCARE SETTINGS",
      settings: [
        "Government hospitals",
        "Primary health centers",
        "Public health camps",
        "Industrial health units",
        "Campus health centers",
      ],
    },
    challenge: {
      label: "THE CHALLENGE",
      title: "Healthcare information",
      accent: "is fragmented.",
      body: "Symptoms, reports, lab results and patient history often arrive in different formats. SehatSetu AI helps bring them together for structured human review.",
      flow: [
        ["PATIENT INFORMATION", "Voice, text, reports, lab data"],
        ["STRUCTURED INFORMATION", "Clear, review-ready triage notes"],
        ["QUALIFIED REVIEW", "Nurse, doctor or medical officer"],
      ],
      cards: [
        [
          "Voice / Text",
          "Capture symptoms naturally, in the way patients communicate.",
        ],
        [
          "Medical Reports",
          "Extract and summarize important information from documents.",
        ],
        [
          "Structured Triage",
          "Convert raw information into review-ready notes.",
        ],
      ],
    },
    capabilities: {
      label: "CAPABILITIES",
      title: "One assistant.",
      accent: "Multiple workflows.",
      body: "Built to help healthcare workers spend less time organizing information and more time caring for people.",
      cards: [
        [
          "Symptom Collection",
          "Capture patient-reported symptoms through text or voice.",
        ],
        [
          "Medical Report Summarization",
          "Turn lengthy reports into concise structured information.",
        ],
        [
          "OCR for Lab Reports",
          "Extract relevant information from uploaded documents.",
        ],
        [
          "Multilingual Support",
          "Support English, Hindi and regional Indian languages.",
        ],
        [
          "Urgency & Missing-Information Flags",
          "Highlight information that may require attention or completion.",
        ],
        [
          "Referral Note Preparation",
          "Create structured referral information for higher-level facilities.",
        ],
      ],
    },
    india: {
      label: "MADE FOR THE REAL WORLD",
      title: "Designed",
      accent: "for India.",
      body: "Built for diverse patient loads, languages, facility types and levels of digital maturity across India.",
      link: "Explore the workflow",
      tags: [
        "Multilingual",
        "Low-bandwidth friendly",
        "Government facilities",
        "Public health camps",
        "Campus healthcare",
      ],
    },
    safety: {
      label: "THE SAFETY PROMISE",
      title: "AI that",
      accent: "knows its limits.",
      body: "SehatSetu AI organizes information and highlights signals. Clinical decisions remain with qualified healthcare professionals.",
      assists: "AI ASSISTS",
      decides: "HUMANS DECIDE",
      loop: "Human-in-the-loop",
      items: [
        "Organizes information",
        "Summarizes reports",
        "Extracts key details",
        "Highlights missing information",
        "Flags urgency signals",
        "Structures referral notes",
      ],
      human: [
        "Clinical interpretation",
        "Diagnosis",
        "Treatment",
        "Final triage decision",
      ],
    },
    workflow: {
      label: "A CLEARER HANDOFF",
      title: "From information",
      accent: "to action.",
      body: "A simple, transparent workflow designed around the people who deliver care.",
      steps: [
        ["PATIENT INPUT", "Text / Voice / Report"],
        ["AI EXTRACTION", "Symptoms / Key details / Missing information"],
        ["TRIAGE SUPPORT", "Urgency signals / Structured summary"],
        ["HUMAN REVIEW", "Nurse / Doctor / Medical Officer"],
        ["NEXT STEP", "Review / Referral / Further assessment"],
      ],
    },
    cta: {
      label: "READY WHEN YOU ARE",
      title: "Make every patient",
      accent: "handoff clearer.",
      body: "Give healthcare workers a faster way to organize information without replacing clinical judgment.",
      demo: "Try the Triage Demo",
      workflow: "Explore the Workflow",
    },
    footer: {
      about: "Human-in-the-loop AI for healthcare triage support.",
      disclaimer:
        "Educational prototype for healthcare triage support. Not a medical diagnostic system. Final decisions must be made by qualified healthcare professionals.",
      care: "Built with care for the people who care.",
    },
  },
  hi: {
    nav: {
      how: "यह कैसे काम करता है",
      capabilities: "क्षमताएँ",
      workers: "स्वास्थ्यकर्मियों के लिए",
      safety: "सुरक्षा",
      about: "हमारे बारे में",
      demo: "डेमो देखें",
      start: "ट्रायेज शुरू करें",
      menuOpen: "मेन्यू खोलें",
      menuClose: "मेन्यू बंद करें",
    },
    hero: {
      eyebrow: "AI-सहायित स्वास्थ्य ट्रायेज",
      title: "रोगी की जानकारी को",
      accent: "स्पष्ट अगले कदमों में बदलें।",
      body: "SehatSetu AI स्वास्थ्यकर्मियों को लक्षणों, चिकित्सा रिपोर्ट और रोगी की जानकारी को तेज़ और सुरक्षित मानव समीक्षा के लिए व्यवस्थित ट्रायेज नोट्स में बदलने में मदद करता है।",
      start: "ट्रायेज शुरू करें",
      how: "यह कैसे काम करता है",
      trust: ["मानव द्वारा समीक्षा", "निदान प्रणाली नहीं", "गोपनीयता-प्रथम"],
    },
    dashboard: {
      kicker: "ट्रायेज सहायक",
      workspace: "रोगी समीक्षा कार्यक्षेत्र",
      assist: "AI सहायता",
      input: "रोगी की जानकारी",
      synthetic: "डेमो डेटा",
      quote: "“4 दिनों से बुखार, खांसी और थकान...”",
      extracted: "निकाली गई जानकारी",
      temperature: "तापमान",
      duration: "अवधि",
      symptoms: "लक्षण",
      days: "4 दिन",
      missing: "अपूर्ण जानकारी",
      respiratory: "श्वसन दर",
      needs: "समीक्षा आवश्यक",
      priority: "समीक्षा प्राथमिकता",
      moderate: "मध्यम",
      flag: "जानकारी के आधार पर ट्रायेज संकेत",
      next: "अगला सुझाया गया कदम",
      review: "योग्य स्वास्थ्यकर्मी द्वारा समीक्षा",
      suggestion: "AI सुझाव",
      decision: "मानव निर्णय",
      professional: "पेशेवर समीक्षा आवश्यक",
    },
    trust: {
      title: "वास्तविक स्वास्थ्य सेवाओं के लिए बनाया गया",
      settings: [
        "सरकारी अस्पताल",
        "प्राथमिक स्वास्थ्य केंद्र",
        "सार्वजनिक स्वास्थ्य शिविर",
        "औद्योगिक स्वास्थ्य इकाइयाँ",
        "कैंपस स्वास्थ्य केंद्र",
      ],
    },
    challenge: {
      label: "चुनौती",
      title: "स्वास्थ्य जानकारी",
      accent: "बिखरी हुई है।",
      body: "लक्षण, रिपोर्ट, लैब परिणाम और रोगी इतिहास अलग-अलग प्रारूपों में आते हैं। SehatSetu AI उन्हें संरचित मानव समीक्षा के लिए एक साथ लाने में मदद करता है।",
      flow: [
        ["रोगी की जानकारी", "आवाज़, टेक्स्ट, रिपोर्ट, लैब डेटा"],
        ["व्यवस्थित जानकारी", "स्पष्ट, समीक्षा-तैयार ट्रायेज नोट्स"],
        ["योग्य समीक्षा", "नर्स, डॉक्टर या चिकित्सा अधिकारी"],
      ],
      cards: [
        [
          "आवाज़ / टेक्स्ट",
          "रोगी जिस तरह संवाद करते हैं, उसी तरह लक्षण दर्ज करें।",
        ],
        [
          "चिकित्सा रिपोर्ट",
          "दस्तावेज़ों से महत्वपूर्ण जानकारी निकालें और संक्षेप करें।",
        ],
        ["संरचित ट्रायेज", "कच्ची जानकारी को समीक्षा-तैयार नोट्स में बदलें।"],
      ],
    },
    capabilities: {
      label: "क्षमताएँ",
      title: "एक सहायक।",
      accent: "कई कार्यप्रवाह।",
      body: "स्वास्थ्यकर्मियों को जानकारी व्यवस्थित करने में कम और लोगों की देखभाल में अधिक समय देने में मदद करने के लिए बनाया गया।",
      cards: [
        [
          "लक्षण संग्रह",
          "टेक्स्ट या आवाज़ के माध्यम से रोगी द्वारा बताए गए लक्षण दर्ज करें।",
        ],
        [
          "चिकित्सा रिपोर्ट सारांश",
          "लंबी रिपोर्ट को संक्षिप्त, व्यवस्थित जानकारी में बदलें।",
        ],
        [
          "लैब रिपोर्ट के लिए OCR",
          "अपलोड किए गए दस्तावेज़ों से उपयोगी जानकारी निकालें।",
        ],
        ["बहुभाषी सहायता", "हिंदी, अंग्रेज़ी और भारतीय भाषाओं में सहायता।"],
        [
          "तत्कालता और अधूरी जानकारी संकेत",
          "ध्यान या पूर्ति की आवश्यकता वाली जानकारी को उभारें।",
        ],
        [
          "रेफरल नोट तैयारी",
          "उच्च-स्तरीय केंद्रों के लिए व्यवस्थित रेफरल जानकारी बनाएँ।",
        ],
      ],
    },
    india: {
      label: "वास्तविक दुनिया के लिए",
      title: "भारत के",
      accent: "लिए बनाया गया।",
      body: "भारत में अलग-अलग रोगी संख्या, भाषाओं, स्वास्थ्य केंद्रों और डिजिटल सुविधाओं को ध्यान में रखकर बनाया गया।",
      link: "कार्यप्रवाह देखें",
      tags: [
        "बहुभाषी",
        "कम बैंडविड्थ के अनुकूल",
        "सरकारी सुविधाएँ",
        "सार्वजनिक स्वास्थ्य शिविर",
        "कैंपस स्वास्थ्य",
      ],
    },
    safety: {
      label: "सुरक्षा का वादा",
      title: "AI अपनी",
      accent: "सीमाएँ जानता है।",
      body: "SehatSetu AI जानकारी व्यवस्थित करता है और संकेतों को उजागर करता है। नैदानिक निर्णय योग्य स्वास्थ्य पेशेवरों के पास रहते हैं।",
      assists: "AI सहायता करता है",
      decides: "मानव निर्णय लेते हैं",
      loop: "मानव विशेषज्ञ की समीक्षा",
      items: [
        "जानकारी व्यवस्थित करना",
        "रिपोर्ट का सारांश",
        "मुख्य विवरण निकालना",
        "अपूर्ण जानकारी उजागर करना",
        "तत्कालता संकेत दिखाना",
        "रेफरल नोट व्यवस्थित करना",
      ],
      human: ["नैदानिक व्याख्या", "निदान", "उपचार", "अंतिम ट्रायेज निर्णय"],
    },
    workflow: {
      label: "स्पष्ट हैंडऑफ",
      title: "जानकारी से",
      accent: "कार्रवाई तक।",
      body: "देखभाल देने वाले लोगों के लिए बनाया गया सरल और पारदर्शी कार्यप्रवाह।",
      steps: [
        ["रोगी की जानकारी", "टेक्स्ट / आवाज़ / रिपोर्ट"],
        ["AI निष्कर्षण", "लक्षण / मुख्य विवरण / अधूरी जानकारी"],
        ["ट्रायेज सहायता", "तत्कालता संकेत / व्यवस्थित सारांश"],
        ["मानव समीक्षा", "नर्स / डॉक्टर / चिकित्सा अधिकारी"],
        ["अगला कदम", "समीक्षा / रेफरल / आगे का आकलन"],
      ],
    },
    cta: {
      label: "जब आप तैयार हों",
      title: "हर रोगी का",
      accent: "हैंडऑफ स्पष्ट बनाएँ।",
      body: "नैदानिक निर्णय को बदले बिना स्वास्थ्यकर्मियों को जानकारी व्यवस्थित करने का तेज़ तरीका दें।",
      demo: "ट्रायेज डेमो आज़माएँ",
      workflow: "कार्यप्रवाह देखें",
    },
    footer: {
      about:
        "स्वास्थ्य ट्रायेज सहायता के लिए मानव विशेषज्ञ की समीक्षा वाला AI।",
      disclaimer:
        "स्वास्थ्य ट्रायेज सहायता के लिए शैक्षिक प्रोटोटाइप। यह कोई चिकित्सा निदान प्रणाली नहीं है। अंतिम निर्णय योग्य स्वास्थ्य पेशेवरों द्वारा लिए जाने चाहिए।",
      care: "देखभाल करने वालों के लिए संवेदनशीलता से बनाया गया।",
    },
  },
  or: {
    nav: {
      how: "ଏହା କିପରି କାମ କରେ",
      capabilities: "କ୍ଷମତା",
      workers: "ସ୍ୱାସ୍ଥ୍ୟକର୍ମୀଙ୍କ ପାଇଁ",
      safety: "ସୁରକ୍ଷା",
      about: "ଆମ ବିଷୟରେ",
      demo: "ଡେମୋ ଦେଖନ୍ତୁ",
      start: "ଟ୍ରାଏଜ୍ ଆରମ୍ଭ କରନ୍ତୁ",
      menuOpen: "ମେନୁ ଖୋଲନ୍ତୁ",
      menuClose: "ମେନୁ ବନ୍ଦ କରନ୍ତୁ",
    },
    hero: {
      eyebrow: "AI-ସହାୟିତ ସ୍ୱାସ୍ଥ୍ୟ ଟ୍ରାଏଜ୍",
      title: "ରୋଗୀଙ୍କ ସୂଚନାକୁ",
      accent: "ସ୍ପଷ୍ଟ ପରବର୍ତ୍ତୀ ପଦକ୍ଷେପରେ ବଦଳାନ୍ତୁ।",
      body: "SehatSetu AI ସ୍ୱାସ୍ଥ୍ୟକର୍ମୀଙ୍କୁ ଲକ୍ଷଣ, ଚିକିତ୍ସା ରିପୋର୍ଟ ଏବଂ ରୋଗୀ ସୂଚନାକୁ ଦ୍ରୁତ, ସୁରକ୍ଷିତ ମାନବ ସମୀକ୍ଷା ପାଇଁ ସୁସଂଗଠିତ ଟ୍ରାଏଜ୍ ନୋଟ୍‌ରେ ବଦଳାଇବାରେ ସାହାଯ୍ୟ କରେ।",
      start: "ଟ୍ରାଏଜ୍ ଆରମ୍ଭ କରନ୍ତୁ",
      how: "ଏହା କିପରି କାମ କରେ",
      trust: ["ମାନବ ସମୀକ୍ଷା", "ନିରାକରଣ ପ୍ରଣାଳୀ ନୁହେଁ", "ଗୋପନୀୟତା-ପ୍ରଥମ"],
    },
    dashboard: {
      kicker: "ଟ୍ରାଏଜ୍ ସହାୟକ",
      workspace: "ରୋଗୀ ସମୀକ୍ଷା କାର୍ଯ୍ୟକ୍ଷେତ୍ର",
      assist: "AI ସହାୟତା",
      input: "ରୋଗୀଙ୍କ ସୂଚନା",
      synthetic: "ଡେମୋ ତଥ୍ୟ",
      quote: "“୪ ଦିନ ଧରି ଜ୍ୱର, କାଶ ଏବଂ ଥକାପଣ...”",
      extracted: "ବାହାର କରାଯାଇଥିବା ସୂଚନା",
      temperature: "ତାପମାତ୍ରା",
      duration: "ଅବଧି",
      symptoms: "ଲକ୍ଷଣ",
      days: "୪ ଦିନ",
      missing: "ଅପୂର୍ଣ୍ଣ ସୂଚନା",
      respiratory: "ଶ୍ୱାସ ପ୍ରଶ୍ୱାସ ହାର",
      needs: "ସମୀକ୍ଷା ଆବଶ୍ୟକ",
      priority: "ସମୀକ୍ଷା ପ୍ରାଥମିକତା",
      moderate: "ମଧ୍ୟମ",
      flag: "ତଥ୍ୟ ଆଧାରିତ ଟ୍ରାଏଜ୍ ସଙ୍କେତ",
      next: "ପରବର୍ତ୍ତୀ ପଦକ୍ଷେପ",
      review: "ଯୋଗ୍ୟ ସ୍ୱାସ୍ଥ୍ୟକର୍ମୀଙ୍କ ଦ୍ୱାରା ସମୀକ୍ଷା",
      suggestion: "AI ପରାମର୍ଶ",
      decision: "ମାନବ ନିଷ୍ପତ୍ତି",
      professional: "ପେଶାଦାର ସମୀକ୍ଷା ଆବଶ୍ୟକ",
    },
    trust: {
      title: "ବାସ୍ତବ ସ୍ୱାସ୍ଥ୍ୟ ସେବା ପାଇଁ ନିର୍ମିତ",
      settings: [
        "ସରକାରୀ ହସ୍ପିଟାଲ",
        "ପ୍ରାଥମିକ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର",
        "ସାର୍ବଜନୀନ ସ୍ୱାସ୍ଥ୍ୟ ଶିବିର",
        "ଶିଳ୍ପ ସ୍ୱାସ୍ଥ୍ୟ ୟୁନିଟ୍",
        "କ୍ୟାମ୍ପସ୍ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର",
      ],
    },
    challenge: {
      label: "ଚ୍ୟାଲେଞ୍ଜ୍",
      title: "ସ୍ୱାସ୍ଥ୍ୟ ସୂଚନା",
      accent: "ବିଭିନ୍ନ ସ୍ଥାନରେ ରହେ।",
      body: "ଲକ୍ଷଣ, ରିପୋର୍ଟ, ଲ୍ୟାବ୍ ଫଳାଫଳ ଏବଂ ରୋଗୀ ଇତିହାସ ଭିନ୍ନ ରୂପରେ ଆସେ। SehatSetu AI ସେଗୁଡ଼ିକୁ ମାନବ ସମୀକ୍ଷା ପାଇଁ ଏକତ୍ର କରିବାରେ ସାହାଯ୍ୟ କରେ।",
      flow: [
        ["ରୋଗୀଙ୍କ ସୂଚନା", "ସ୍ୱର, ଟେକ୍ସଟ୍, ରିପୋର୍ଟ, ଲ୍ୟାବ୍ ତଥ୍ୟ"],
        ["ସୁସଂଗଠିତ ସୂଚନା", "ସ୍ପଷ୍ଟ, ସମୀକ୍ଷା-ପ୍ରସ୍ତୁତ ଟ୍ରାଏଜ୍ ନୋଟ୍"],
        ["ଯୋଗ୍ୟ ସମୀକ୍ଷା", "ନର୍ସ, ଡାକ୍ତର କିମ୍ବା ଚିକିତ୍ସା ଅଧିକାରୀ"],
      ],
      cards: [
        [
          "ସ୍ୱର / ଟେକ୍ସଟ୍",
          "ରୋଗୀମାନେ ଯେପରି କଥା ହୁଅନ୍ତି, ସେହିପରି ଲକ୍ଷଣ ରେକର୍ଡ କରନ୍ତୁ।",
        ],
        [
          "ଚିକିତ୍ସା ରିପୋର୍ଟ",
          "ଦସ୍ତାବିଜରୁ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ସୂଚନା ବାହାର କରି ସଂକ୍ଷେପ କରନ୍ତୁ।",
        ],
        [
          "ସୁସଂଗଠିତ ଟ୍ରାଏଜ୍",
          "କଚ୍ଚା ସୂଚନାକୁ ସମୀକ୍ଷା-ପ୍ରସ୍ତୁତ ନୋଟ୍‌ରେ ବଦଳାନ୍ତୁ।",
        ],
      ],
    },
    capabilities: {
      label: "କ୍ଷମତା",
      title: "ଗୋଟିଏ ସହାୟକ।",
      accent: "ଅନେକ କାର୍ଯ୍ୟପ୍ରବାହ।",
      body: "ସ୍ୱାସ୍ଥ୍ୟକର୍ମୀଙ୍କୁ ସୂଚନା ସଜାଇବାରେ କମ୍ ଏବଂ ଲୋକଙ୍କ ଯତ୍ନରେ ଅଧିକ ସମୟ ଦେବାରେ ସାହାଯ୍ୟ କରିବା ପାଇଁ ନିର୍ମିତ।",
      cards: [
        [
          "ଲକ୍ଷଣ ସଂଗ୍ରହ",
          "ଟେକ୍ସଟ୍ କିମ୍ବା ସ୍ୱର ମାଧ୍ୟମରେ ରୋଗୀଙ୍କ ଲକ୍ଷଣ ରେକର୍ଡ କରନ୍ତୁ।",
        ],
        [
          "ଚିକିତ୍ସା ରିପୋର୍ଟ ସାରାଂଶ",
          "ଦୀର୍ଘ ରିପୋର୍ଟକୁ ସଂକ୍ଷିପ୍ତ, ସୁସଂଗଠିତ ସୂଚନାରେ ବଦଳାନ୍ତୁ।",
        ],
        [
          "ଲ୍ୟାବ୍ ରିପୋର୍ଟ ପାଇଁ OCR",
          "ଅପଲୋଡ୍ ହୋଇଥିବା ଦସ୍ତାବିଜରୁ ଆବଶ୍ୟକ ସୂଚନା ବାହାର କରନ୍ତୁ।",
        ],
        ["ବହୁଭାଷୀ ସହାୟତା", "ଓଡ଼ିଆ, ହିନ୍ଦୀ, ଇଂରାଜୀ ଏବଂ ଭାରତୀୟ ଭାଷାରେ ସହାୟତା।"],
        [
          "ତତ୍କାଳତା ଏବଂ ଅପୂର୍ଣ୍ଣ ସୂଚନା ସଙ୍କେତ",
          "ଧ୍ୟାନ କିମ୍ବା ପୂରଣ ଆବଶ୍ୟକ ସୂଚନାକୁ ଚିହ୍ନଟ କରନ୍ତୁ।",
        ],
        [
          "ରେଫରାଲ୍ ନୋଟ୍ ପ୍ରସ୍ତୁତି",
          "ଉଚ୍ଚସ୍ତରୀୟ କେନ୍ଦ୍ର ପାଇଁ ସୁସଂଗଠିତ ରେଫରାଲ୍ ସୂଚନା ତିଆରି କରନ୍ତୁ।",
        ],
      ],
    },
    india: {
      label: "ବାସ୍ତବ ଦୁନିଆ ପାଇଁ",
      title: "ଭାରତ ପାଇଁ",
      accent: "ନିର୍ମିତ।",
      body: "ଭାରତର ବିଭିନ୍ନ ରୋଗୀ ସଂଖ୍ୟା, ଭାଷା, ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର ଏବଂ ଡିଜିଟାଲ୍ ସୁବିଧାକୁ ଧ୍ୟାନରେ ରଖି ନିର୍ମିତ।",
      link: "କାର୍ଯ୍ୟପ୍ରବାହ ଦେଖନ୍ତୁ",
      tags: [
        "ବହୁଭାଷୀ",
        "କମ୍ ବ୍ୟାଣ୍ଡୱିଡ୍‌ଥ ପାଇଁ ଉପଯୁକ୍ତ",
        "ସରକାରୀ ସୁବିଧା",
        "ସାର୍ବଜନୀନ ସ୍ୱାସ୍ଥ୍ୟ ଶିବିର",
        "କ୍ୟାମ୍ପସ୍ ସ୍ୱାସ୍ଥ୍ୟ",
      ],
    },
    safety: {
      label: "ସୁରକ୍ଷାର ପ୍ରତିଶ୍ରୁତି",
      title: "AI ନିଜର",
      accent: "ସୀମା ଜାଣେ।",
      body: "SehatSetu AI ସୂଚନାକୁ ସୁସଂଗଠିତ କରେ ଏବଂ ସଙ୍କେତ ଦେଖାଏ। ଚିକିତ୍ସା ନିଷ୍ପତ୍ତି ଯୋଗ୍ୟ ସ୍ୱାସ୍ଥ୍ୟ ପେଶାଦାରଙ୍କ ପାଖରେ ରହେ।",
      assists: "AI ସାହାଯ୍ୟ କରେ",
      decides: "ମାନବ ନିଷ୍ପତ୍ତି ନିଅନ୍ତି",
      loop: "ମାନବ ବିଶେଷଜ୍ଞଙ୍କ ସମୀକ୍ଷା",
      items: [
        "ସୂଚନା ସଜାଇବା",
        "ରିପୋର୍ଟ ସାରାଂଶ କରିବା",
        "ମୁଖ୍ୟ ବିବରଣୀ ବାହାର କରିବା",
        "ଅପୂର୍ଣ୍ଣ ସୂଚନା ଦେଖାଇବା",
        "ତତ୍କାଳତା ସଙ୍କେତ ଦେଖାଇବା",
        "ରେଫରାଲ୍ ନୋଟ୍ ସଜାଇବା",
      ],
      human: [
        "ଚିକିତ୍ସା ବ୍ୟାଖ୍ୟା",
        "ନିରାକରଣ",
        "ଚିକିତ୍ସା",
        "ଅନ୍ତିମ ଟ୍ରାଏଜ୍ ନିଷ୍ପତ୍ତି",
      ],
    },
    workflow: {
      label: "ସ୍ପଷ୍ଟ ହ୍ୟାଣ୍ଡଅଫ୍",
      title: "ସୂଚନାରୁ",
      accent: "କାର୍ଯ୍ୟ ପର୍ଯ୍ୟନ୍ତ।",
      body: "ଯତ୍ନ ପ୍ରଦାନ କରୁଥିବା ଲୋକଙ୍କ ପାଇଁ ଏକ ସରଳ, ସ୍ୱଚ୍ଛ କାର୍ଯ୍ୟପ୍ରବାହ।",
      steps: [
        ["ରୋଗୀଙ୍କ ସୂଚନା", "ଟେକ୍ସଟ୍ / ସ୍ୱର / ରିପୋର୍ଟ"],
        ["AI ନିଷ୍କର୍ଷଣ", "ଲକ୍ଷଣ / ମୁଖ୍ୟ ବିବରଣୀ / ଅପୂର୍ଣ୍ଣ ସୂଚନା"],
        ["ଟ୍ରାଏଜ୍ ସହାୟତା", "ତତ୍କାଳତା ସଙ୍କେତ / ସୁସଂଗଠିତ ସାରାଂଶ"],
        ["ମାନବ ସମୀକ୍ଷା", "ନର୍ସ / ଡାକ୍ତର / ଚିକିତ୍ସା ଅଧିକାରୀ"],
        ["ପରବର୍ତ୍ତୀ ପଦକ୍ଷେପ", "ସମୀକ୍ଷା / ରେଫରାଲ୍ / ଅଧିକ ମୂଲ୍ୟାଙ୍କନ"],
      ],
    },
    cta: {
      label: "ଆପଣ ପ୍ରସ୍ତୁତ ହେଲେ",
      title: "ପ୍ରତ୍ୟେକ ରୋଗୀଙ୍କ",
      accent: "ହ୍ୟାଣ୍ଡଅଫ୍ ସ୍ପଷ୍ଟ କରନ୍ତୁ।",
      body: "ଚିକିତ୍ସା ନିଷ୍ପତ୍ତିକୁ ବଦଳାଇ ନ ଦେଇ ସ୍ୱାସ୍ଥ୍ୟକର୍ମୀଙ୍କୁ ସୂଚନା ସଜାଇବାର ଦ୍ରୁତ ଉପାୟ ଦିଅନ୍ତୁ।",
      demo: "ଟ୍ରାଏଜ୍ ଡେମୋ ଚେଷ୍ଟା କରନ୍ତୁ",
      workflow: "କାର୍ଯ୍ୟପ୍ରବାହ ଦେଖନ୍ତୁ",
    },
    footer: {
      about: "ସ୍ୱାସ୍ଥ୍ୟ ଟ୍ରାଏଜ୍ ସହାୟତା ପାଇଁ ମାନବ-ସମୀକ୍ଷା ଥିବା AI।",
      disclaimer:
        "ସ୍ୱାସ୍ଥ୍ୟ ଟ୍ରାଏଜ୍ ସହାୟତା ପାଇଁ ଏକ ଶିକ୍ଷାମୂଳକ ପ୍ରୋଟୋଟାଇପ୍। ଏହା କୌଣସି ଚିକିତ୍ସା ନିରାକରଣ ପ୍ରଣାଳୀ ନୁହେଁ। ଅନ୍ତିମ ନିଷ୍ପତ୍ତି ଯୋଗ୍ୟ ସ୍ୱାସ୍ଥ୍ୟ ପେଶାଦାରମାନେ ନେବା ଉଚିତ।",
      care: "ଯତ୍ନ ନେଉଥିବା ଲୋକଙ୍କ ପାଇଁ ଯତ୍ନରେ ନିର୍ମିତ।",
    },
  },
} as const;

export type Copy = (typeof translations)["en"];
export function getCopy(locale: Locale): Copy {
  return translations[locale] as Copy;
}
export function detectLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem(
    "sehatsetu-locale",
  ) as Locale | null;
  if (saved && locales.includes(saved)) return saved;
  const language = navigator.language.toLowerCase();
  if (language.startsWith("hi")) return "hi";
  if (language.startsWith("or")) return "or";
  return "en";
}
export function localeFromPath(): Locale {
  if (typeof window === "undefined") return "en";
  const value = window.location.pathname.split("/")[1] as Locale;
  return locales.includes(value) ? value : detectLocale();
}
export function setLocale(locale: Locale) {
  window.localStorage.setItem("sehatsetu-locale", locale);
  const path = window.location.pathname.split("/").filter(Boolean);
  const next =
    path[0] && locales.includes(path[0] as Locale) ? path.slice(1) : path;
  window.history.pushState(
    {},
    "",
    `/${locale}${next.length ? `/${next.join("/")}` : ""}${window.location.hash}`,
  );
  window.dispatchEvent(new Event("localechange"));
}
export default translations;
