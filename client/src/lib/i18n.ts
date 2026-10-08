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
        ["PATIENT INFORMATION", "Text intake and selectable-text reports"],
        ["STRUCTURED INFORMATION", "Clear, review-ready triage notes"],
        ["QUALIFIED REVIEW", "Nurse, doctor or medical officer"],
      ],
      cards: [
        [
          "Text intake",
          "Capture patient-reported symptoms in written messages.",
        ],
        [
          "Medical Reports",
          "Extract text from selectable-text PDF, TXT, and CSV reports for human review.",
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
          "Capture patient-reported symptoms through text.",
        ],
        [
          "Medical Report Summarization",
          "Turn lengthy reports into concise structured information.",
        ],
        [
          "PDF text extraction (no OCR)",
          "Read selectable text from PDFs up to 10 pages. Scans and images are not supported.",
        ],
        [
          "Multilingual Support",
          "Patient intake support in English, Hindi, and Odia.",
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
        ["PATIENT INPUT", "Text / selectable-text report"],
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
        ["रोगी की जानकारी", "टेक्स्ट और टेक्स्ट-चयन योग्य रिपोर्ट"],
        ["व्यवस्थित जानकारी", "स्पष्ट, समीक्षा-तैयार ट्रायेज नोट्स"],
        ["योग्य समीक्षा", "नर्स, डॉक्टर या चिकित्सा अधिकारी"],
      ],
      cards: [
        [
          "लिखित जानकारी",
          "रोगी द्वारा बताए गए लक्षणों को लिखित संदेशों में दर्ज करें।",
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
          "रोगी द्वारा बताए गए लक्षणों को टेक्स्ट संदेशों से दर्ज करें।",
        ],
        [
          "चिकित्सा रिपोर्ट सारांश",
          "लंबी रिपोर्ट को संक्षिप्त, व्यवस्थित जानकारी में बदलें।",
        ],
        [
          "PDF टेक्स्ट निष्कर्षण (OCR नहीं)",
          "10 पृष्ठों तक के टेक्स्ट-चयन योग्य PDF पढ़ें। स्कैन और तस्वीरें समर्थित नहीं हैं।",
        ],
        ["बहुभाषी सहायता", "रोगी इंटेक अंग्रेज़ी, हिंदी और ओड़िया में उपलब्ध।"],
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
        ["रोगी की जानकारी", "टेक्स्ट / टेक्स्ट-चयन योग्य रिपोर्ट"],
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
        ["ରୋଗୀଙ୍କ ସୂଚନା", "ଟେକ୍ସଟ୍ ଏବଂ ଚୟନଯୋଗ୍ୟ ଲେଖା ରିପୋର୍ଟ"],
        ["ସୁସଂଗଠିତ ସୂଚନା", "ସ୍ପଷ୍ଟ, ସମୀକ୍ଷା-ପ୍ରସ୍ତୁତ ଟ୍ରାଏଜ୍ ନୋଟ୍"],
        ["ଯୋଗ୍ୟ ସମୀକ୍ଷା", "ନର୍ସ, ଡାକ୍ତର କିମ୍ବା ଚିକିତ୍ସା ଅଧିକାରୀ"],
      ],
      cards: [
        [
          "ଲିଖିତ ତଥ୍ୟ",
          "ରୋଗୀଙ୍କ ଲକ୍ଷଣକୁ ଲିଖିତ ବାର୍ତ୍ତାରେ ରେକର୍ଡ କରନ୍ତୁ।",
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
          "ରୋଗୀଙ୍କ ଲକ୍ଷଣକୁ ଟେକ୍ସଟ୍ ବାର୍ତ୍ତାରେ ରେକର୍ଡ କରନ୍ତୁ।",
        ],
        [
          "ଚିକିତ୍ସା ରିପୋର୍ଟ ସାରାଂଶ",
          "ଦୀର୍ଘ ରିପୋର୍ଟକୁ ସଂକ୍ଷିପ୍ତ, ସୁସଂଗଠିତ ସୂଚନାରେ ବଦଳାନ୍ତୁ।",
        ],
        [
          "PDF ଟେକ୍ସଟ୍ ବାହାର କରିବା (OCR ନୁହେଁ)",
          "10 ପୃଷ୍ଠା ପର୍ଯ୍ୟନ୍ତ ଚୟନଯୋଗ୍ୟ ଟେକ୍ସଟ୍ PDF ପଢ଼ନ୍ତୁ। ସ୍କାନ୍ ଓ ଚିତ୍ର ସମର୍ଥିତ ନୁହେଁ।",
        ],
        ["ବହୁଭାଷୀ ସହାୟତା", "ରୋଗୀଙ୍କ ଇନଟେକ୍ ଇଂରାଜୀ, ହିନ୍ଦୀ ଓ ଓଡ଼ିଆରେ ଉପଲବ୍ଧ।"],
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
        ["ରୋଗୀଙ୍କ ସୂଚନା", "ଟେକ୍ସଟ୍ / ଚୟନଯୋଗ୍ୟ ଲେଖା ରିପୋର୍ଟ"],
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

const patientTranslations = {
  en: {
    setupTitle: "Let's prepare your intake.",
    setupBody: "Choose your care facility and the language you want to use.",
    facility: "Select facility",
    chooseFacility: "Choose a facility",
    intakeLanguage: "Intake language",
    syntheticConsent:
      "I will use synthetic demo information only, not real patient data. Text and report extracts are shared with the configured AI provider and this facility's care team. This prototype does not diagnose or recommend treatment.",
    startIntake: "Start intake",
    startNewCase: "Start new case",
    casesTitle: "My Cases",
    casesBody: "Review your cases, status, and care-team updates.",
    noCases: "No cases yet",
    noCasesBody: "Your cases will appear here after you start an intake.",
    openCase: "View case",
    answerQuestions: "Answer care-team questions",
    completedNotice:
      "Open this case to review your care team's next steps. If none are listed, contact the facility to confirm what to do.",
    deleteCase: "Delete case data",
    retention: "Scheduled for permanent deletion on {date}.",
    deleteAccount: "Delete my account and all data",
    deleteAccountConfirm:
      "This permanently deletes your account and all linked case data. Type DELETE to confirm.",
    deleteConfirm:
      "Permanently delete this case and its intake, report, summary, question, and review data? This cannot be undone.",
    intakeTitle: "Tell us what brings you in.",
    intakeMode: "TEXT INTAKE",
    intakeBody:
      "Describe what is bothering you and when it started. This prepares information for your care team.",
    consentTitle: "Before continuing",
    consentBody:
      "Use synthetic demo text only. Do not enter real patient information. Your text and extracted report text are sent to the configured AI provider and shared with this facility's care team. This prototype does not diagnose or recommend treatment.",
    agreeContinue: "Agree and continue",
    reportTitle: "Add a medical report",
    reportHelp:
      "PDF with selectable text, TXT, or CSV · up to 5 MB. Scanned PDFs and images are not supported. Extracted text is saved to this case for care-team review.",
    uploadReport: "Upload report",
    extracting: "Extracting...",
    messagePlaceholder: "Write your message...",
    sendMessage: "Send message",
    summaryTitle: "Intake summary",
    summaryLoading: "Your summary will develop as you answer a few questions.",
    timeline: "Reported timeline · verify with patient",
    emergencyWarning: "Possible emergency warning",
    loadingConversation: "Loading your conversation...",
    loadingFollowUp: "Preparing a follow-up...",
    reviewQuestions: "Still useful to know",
    contradictions: "Conflicting details to clarify",
    urgencySignals: "Needs attention",
    priorityReviewTitle: "Priority review",
    priorityReviewBody:
      "Your care team placed this case in a priority review queue. Open the case for messages or questions. If you need help before you receive a response, contact the facility directly rather than waiting for this app. This label is not a diagnosis.",
    urgentReviewTitle: "Urgent: contact your care facility",
    urgentReviewBody:
      "This case has been flagged for prompt human review. This app is not monitored continuously and cannot contact staff or emergency services for you. Contact your care facility now to confirm what to do. If you believe this is an emergency, call 112 in India or go to the nearest emergency department.",
    guidanceTitle: "Care-team guidance",
    noGuidanceTitle: "No care-team instructions are recorded",
    noGuidanceBody:
      "This case is marked complete, but no next steps have been shared here. Contact your care facility to confirm what to do. If this is an emergency, call your local emergency number or go to the nearest emergency department.",
    messagingPaused: "Messaging is paused while your care team reviews this case.",
    disclaimer:
      "Synthetic demo information only. This assistant does not diagnose or recommend treatment.",
  },
  hi: {
    setupTitle: "आइए, आपकी जानकारी तैयार करें।",
    setupBody: "अपनी स्वास्थ्य सुविधा और उपयोग की भाषा चुनें।",
    facility: "स्वास्थ्य सुविधा चुनें",
    chooseFacility: "सुविधा चुनें",
    intakeLanguage: "जानकारी देने की भाषा",
    syntheticConsent:
      "मैं केवल कृत्रिम डेमो जानकारी दूँगा/दूँगी, असली मरीज़ का डेटा नहीं। टेक्स्ट और रिपोर्ट से निकाली गई जानकारी AI सेवा और इस सुविधा की स्वास्थ्य टीम के साथ साझा होगी। यह प्रोटोटाइप बीमारी का निदान या उपचार की सलाह नहीं देता।",
    startIntake: "जानकारी देना शुरू करें",
    startNewCase: "नया मामला शुरू करें",
    casesTitle: "मेरे मामले",
    casesBody: "अपने मामले, उनकी स्थिति और स्वास्थ्य टीम के अपडेट देखें।",
    noCases: "अभी कोई मामला नहीं",
    noCasesBody: "जानकारी देना शुरू करने के बाद आपके मामले यहाँ दिखेंगे।",
    openCase: "मामला देखें",
    answerQuestions: "स्वास्थ्य टीम के सवालों के जवाब दें",
    completedNotice:
      "स्वास्थ्य टीम के अगले कदम देखने के लिए मामला खोलें। अगर निर्देश नहीं हैं, तो क्या करना है जानने के लिए सुविधा से संपर्क करें।",
    deleteCase: "मामले का डेटा मिटाएँ",
    retention: "इसका डेटा {date} को हमेशा के लिए मिटा दिया जाएगा।",
    deleteAccount: "मेरा खाता और सारा डेटा मिटाएँ",
    deleteAccountConfirm:
      "इससे आपका खाता और उससे जुड़ा सारा मामला डेटा हमेशा के लिए मिट जाएगा। पुष्टि के लिए DELETE लिखें।",
    deleteConfirm:
      "क्या इस मामले की जानकारी, रिपोर्ट, सारांश, सवाल और समीक्षा डेटा हमेशा के लिए मिटाना है? इसे वापस नहीं लाया जा सकता।",
    intakeTitle: "बताइए, आप यहाँ क्यों आए हैं।",
    intakeMode: "लिखित जानकारी",
    intakeBody:
      "बताइए कि क्या परेशानी है और यह कब शुरू हुई। इससे स्वास्थ्य टीम के लिए जानकारी तैयार होगी।",
    consentTitle: "आगे बढ़ने से पहले",
    consentBody:
      "केवल कृत्रिम डेमो टेक्स्ट दें। असली मरीज़ की जानकारी न डालें। आपका टेक्स्ट और रिपोर्ट से निकाला गया टेक्स्ट AI सेवा और इस सुविधा की स्वास्थ्य टीम के साथ साझा होगा। यह प्रोटोटाइप निदान या उपचार की सलाह नहीं देता।",
    agreeContinue: "सहमति दें और आगे बढ़ें",
    reportTitle: "मेडिकल रिपोर्ट जोड़ें",
    reportHelp:
      "चुने जा सकने वाले टेक्स्ट वाला PDF, TXT या CSV · अधिकतम 5 MB। स्कैन किए गए PDF और तस्वीरें समर्थित नहीं हैं। निकाला गया टेक्स्ट स्वास्थ्य टीम की समीक्षा के लिए इस मामले में सहेजा जाएगा।",
    uploadReport: "रिपोर्ट अपलोड करें",
    extracting: "टेक्स्ट निकाला जा रहा है...",
    messagePlaceholder: "अपना संदेश लिखें...",
    sendMessage: "संदेश भेजें",
    summaryTitle: "जानकारी का सारांश",
    summaryLoading: "आपके जवाबों के साथ सारांश तैयार होगा।",
    timeline: "बताई गई समयरेखा · मरीज़ से पुष्टि करें",
    emergencyWarning: "आपात स्थिति की आशंका",
    loadingConversation: "आपकी बातचीत लोड हो रही है...",
    loadingFollowUp: "अगला सवाल तैयार हो रहा है...",
    reviewQuestions: "इन बातों की जानकारी उपयोगी होगी",
    contradictions: "विरोधाभासी जानकारी स्पष्ट करें",
    urgencySignals: "ध्यान देने की ज़रूरत",
    priorityReviewTitle: "प्राथमिकता से समीक्षा",
    priorityReviewBody:
      "आपकी स्वास्थ्य टीम ने इस मामले को प्राथमिकता से समीक्षा के लिए रखा है। संदेश या सवाल देखने के लिए मामला खोलें। जवाब मिलने से पहले मदद चाहिए, तो इस ऐप का इंतज़ार करने के बजाय सीधे स्वास्थ्य सुविधा से संपर्क करें। यह लेबल बीमारी का निदान नहीं है।",
    urgentReviewTitle: "तत्काल: स्वास्थ्य सुविधा से संपर्क करें",
    urgentReviewBody:
      "इस मामले को स्वास्थ्यकर्मी द्वारा शीघ्र समीक्षा के लिए चिह्नित किया गया है। यह ऐप लगातार निगरानी नहीं करता और आपकी ओर से स्वास्थ्यकर्मियों या आपातकालीन सेवाओं से संपर्क नहीं कर सकता। आगे क्या करना है, इसकी पुष्टि के लिए अभी अपनी स्वास्थ्य सुविधा से संपर्क करें। आपात स्थिति लगे तो भारत में 112 पर कॉल करें या नज़दीकी आपातकालीन विभाग जाएँ।",
    guidanceTitle: "स्वास्थ्य टीम की सलाह",
    noGuidanceTitle: "स्वास्थ्य टीम के निर्देश दर्ज नहीं हैं",
    noGuidanceBody:
      "यह मामला पूरा दिखाया गया है, लेकिन आगे के कदम यहाँ साझा नहीं किए गए हैं। क्या करना है, इसकी पुष्टि के लिए स्वास्थ्य सुविधा से संपर्क करें। आपात स्थिति में स्थानीय आपातकालीन नंबर पर कॉल करें या नज़दीकी आपातकालीन विभाग जाएँ।",
    messagingPaused: "स्वास्थ्य टीम की समीक्षा के दौरान संदेश भेजना रुका हुआ है।",
    disclaimer:
      "केवल कृत्रिम डेमो जानकारी। यह सहायक बीमारी का निदान या उपचार की सलाह नहीं देता।",
  },
  or: {
    setupTitle: "ଆସନ୍ତୁ, ଆପଣଙ୍କ ତଥ୍ୟ ପ୍ରସ୍ତୁତ କରିବା।",
    setupBody: "ଆପଣଙ୍କ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର ଓ ପସନ୍ଦର ଭାଷା ବାଛନ୍ତୁ।",
    facility: "ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର ବାଛନ୍ତୁ",
    chooseFacility: "ଏକ କେନ୍ଦ୍ର ବାଛନ୍ତୁ",
    intakeLanguage: "ତଥ୍ୟ ଦେବାର ଭାଷା",
    syntheticConsent:
      "ମୁଁ କେବଳ କୃତ୍ରିମ ଡେମୋ ତଥ୍ୟ ବ୍ୟବହାର କରିବି, ପ୍ରକୃତ ରୋଗୀଙ୍କ ତଥ୍ୟ ନୁହେଁ। ଲେଖା ଓ ରିପୋର୍ଟରୁ ବାହାର କରାଯାଇଥିବା ତଥ୍ୟ AI ସେବା ଏବଂ ଏହି କେନ୍ଦ୍ରର ସ୍ୱାସ୍ଥ୍ୟ ଦଳ ସହିତ ବାଣ୍ଟାଯିବ। ଏହି ପ୍ରୋଟୋଟାଇପ୍ ରୋଗ ନିର୍ଣ୍ଣୟ କିମ୍ବା ଚିକିତ୍ସା ପରାମର୍ଶ ଦିଏ ନାହିଁ।",
    startIntake: "ତଥ୍ୟ ଦେବା ଆରମ୍ଭ କରନ୍ତୁ",
    startNewCase: "ନୂଆ ମାମଲା ଆରମ୍ଭ କରନ୍ତୁ",
    casesTitle: "ମୋର ମାମଲା",
    casesBody: "ମାମଲାର ସ୍ଥିତି ଓ ସ୍ୱାସ୍ଥ୍ୟ ଦଳର ଅଦ୍ୟତନ ଦେଖନ୍ତୁ।",
    noCases: "ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ମାମଲା ନାହିଁ",
    noCasesBody: "ତଥ୍ୟ ଦେବା ଆରମ୍ଭ କଲେ ଆପଣଙ୍କ ମାମଲା ଏଠାରେ ଦେଖାଯିବ।",
    openCase: "ମାମଲା ଦେଖନ୍ତୁ",
    answerQuestions: "ସ୍ୱାସ୍ଥ୍ୟ ଦଳର ପ୍ରଶ୍ନର ଉତ୍ତର ଦିଅନ୍ତୁ",
    completedNotice:
      "ସ୍ୱାସ୍ଥ୍ୟ ଦଳର ପରବର୍ତ୍ତୀ ପଦକ୍ଷେପ ଦେଖିବାକୁ ମାମଲା ଖୋଲନ୍ତୁ। ନିର୍ଦ୍ଦେଶ ନଥିଲେ କଣ କରିବେ ଜାଣିବା ପାଇଁ କେନ୍ଦ୍ର ସହିତ ଯୋଗାଯୋଗ କରନ୍ତୁ।",
    deleteCase: "ମାମଲାର ତଥ୍ୟ ହଟାନ୍ତୁ",
    retention: "ଏହି ତଥ୍ୟ {date} ରେ ସବୁଦିନ ପାଇଁ ହଟାଯିବ।",
    deleteAccount: "ମୋ ଖାତା ଓ ସମସ୍ତ ତଥ୍ୟ ହଟାନ୍ତୁ",
    deleteAccountConfirm:
      "ଏହା ଆପଣଙ୍କ ଖାତା ଏବଂ ସମସ୍ତ ସଂଯୁକ୍ତ ମାମଲା ତଥ୍ୟକୁ ସବୁଦିନ ପାଇଁ ହଟାଇଦେବ। ନିଶ୍ଚିତ କରିବାକୁ DELETE ଲେଖନ୍ତୁ।",
    deleteConfirm:
      "ଏହି ମାମଲାର ତଥ୍ୟ, ରିପୋର୍ଟ, ସାରାଂଶ, ପ୍ରଶ୍ନ ଓ ସମୀକ୍ଷା ତଥ୍ୟ ସବୁଦିନ ପାଇଁ ହଟାଇବେ କି? ଏହାକୁ ଫେରାଇ ଅଣାଯାଇପାରିବ ନାହିଁ।",
    intakeTitle: "ଆପଣଙ୍କୁ କଣ ଅସୁବିଧା ହେଉଛି କୁହନ୍ତୁ।",
    intakeMode: "ଲିଖିତ ତଥ୍ୟ",
    intakeBody:
      "କେଉଁ ଅସୁବିଧା ହେଉଛି ଏବଂ କେବେ ଆରମ୍ଭ ହେଲା କୁହନ୍ତୁ। ଏହା ସ୍ୱାସ୍ଥ୍ୟ ଦଳ ପାଇଁ ତଥ୍ୟ ପ୍ରସ୍ତୁତ କରିବ।",
    consentTitle: "ଆଗକୁ ବଢ଼ିବା ପୂର୍ବରୁ",
    consentBody:
      "କେବଳ କୃତ୍ରିମ ଡେମୋ ଲେଖା ବ୍ୟବହାର କରନ୍ତୁ। ପ୍ରକୃତ ରୋଗୀଙ୍କ ତଥ୍ୟ ଦିଅନ୍ତୁ ନାହିଁ। ଆପଣଙ୍କ ଲେଖା ଓ ରିପୋର୍ଟରୁ ବାହାର କରାଯାଇଥିବା ଲେଖା AI ସେବା ଓ ଏହି କେନ୍ଦ୍ରର ସ୍ୱାସ୍ଥ୍ୟ ଦଳ ସହିତ ବାଣ୍ଟାଯିବ। ଏହି ପ୍ରୋଟୋଟାଇପ୍ ରୋଗ ନିର୍ଣ୍ଣୟ କିମ୍ବା ଚିକିତ୍ସା ପରାମର୍ଶ ଦିଏ ନାହିଁ।",
    agreeContinue: "ସମ୍ମତି ଦେଇ ଆଗକୁ ବଢ଼ନ୍ତୁ",
    reportTitle: "ମେଡିକାଲ୍ ରିପୋର୍ଟ ଯୋଡ଼ନ୍ତୁ",
    reportHelp:
      "ଚୟନଯୋଗ୍ୟ ଲେଖା ଥିବା PDF, TXT କିମ୍ବା CSV · ସର୍ବାଧିକ 5 MB। ସ୍କାନ୍ କରାଯାଇଥିବା PDF ଓ ଚିତ୍ର ସମର୍ଥିତ ନୁହେଁ। ବାହାର କରାଯାଇଥିବା ଲେଖା ସ୍ୱାସ୍ଥ୍ୟ ଦଳର ସମୀକ୍ଷା ପାଇଁ ଏହି ମାମଲାରେ ସଞ୍ଚୟ ହେବ।",
    uploadReport: "ରିପୋର୍ଟ ଅପଲୋଡ୍ କରନ୍ତୁ",
    extracting: "ଲେଖା ବାହାର କରାଯାଉଛି...",
    messagePlaceholder: "ଆପଣଙ୍କ ବାର୍ତ୍ତା ଲେଖନ୍ତୁ...",
    sendMessage: "ବାର୍ତ୍ତା ପଠାନ୍ତୁ",
    summaryTitle: "ତଥ୍ୟର ସାରାଂଶ",
    summaryLoading: "ଆପଣଙ୍କ ଉତ୍ତର ସହିତ ସାରାଂଶ ପ୍ରସ୍ତୁତ ହେବ।",
    timeline: "କୁହାଯାଇଥିବା ସମୟରେଖା · ରୋଗୀଙ୍କଠାରୁ ଯାଞ୍ଚ କରନ୍ତୁ",
    emergencyWarning: "ଜରୁରୀ ପରିସ୍ଥିତିର ସମ୍ଭାବ୍ୟ ସତର୍କତା",
    loadingConversation: "ଆପଣଙ୍କ ବାର୍ତ୍ତାଳାପ ଲୋଡ୍ ହେଉଛି...",
    loadingFollowUp: "ପରବର୍ତ୍ତୀ ପ୍ରଶ୍ନ ପ୍ରସ୍ତୁତ ହେଉଛି...",
    reviewQuestions: "ଏହି ତଥ୍ୟ ଜାଣିବା ଉପଯୋଗୀ ହେବ",
    contradictions: "ପରସ୍ପର ବିରୋଧୀ ତଥ୍ୟ ସ୍ପଷ୍ଟ କରନ୍ତୁ",
    urgencySignals: "ଧ୍ୟାନ ଦେବା ଆବଶ୍ୟକ",
    priorityReviewTitle: "ପ୍ରାଥମିକତା ଭିତ୍ତିକ ସମୀକ୍ଷା",
    priorityReviewBody:
      "ଆପଣଙ୍କ ସ୍ୱାସ୍ଥ୍ୟ ଦଳ ଏହି ମାମଲାକୁ ପ୍ରାଥମିକତା ଭିତ୍ତିକ ସମୀକ୍ଷା ପାଇଁ ରଖିଛନ୍ତି। ବାର୍ତ୍ତା କିମ୍ବା ପ୍ରଶ୍ନ ଦେଖିବାକୁ ମାମଲା ଖୋଲନ୍ତୁ। ଉତ୍ତର ପୂର୍ବରୁ ସହାୟତା ଦରକାର ହେଲେ, ଏହି ଆପ୍‌କୁ ଅପେକ୍ଷା ନକରି ସିଧାସଳଖ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର ସହ ଯୋଗାଯୋଗ କରନ୍ତୁ। ଏହି ଲେବଲ୍ ରୋଗ ନିର୍ଣ୍ଣୟ ନୁହେଁ।",
    urgentReviewTitle: "ଜରୁରୀ: ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର ସହ ଯୋଗାଯୋଗ କରନ୍ତୁ",
    urgentReviewBody:
      "ଏହି ମାମଲାକୁ ସ୍ୱାସ୍ଥ୍ୟକର୍ମୀଙ୍କ ଶୀଘ୍ର ସମୀକ୍ଷା ପାଇଁ ଚିହ୍ନିତ କରାଯାଇଛି। ଏହି ଆପ୍ ଲଗାତାର ନଜର ରଖେ ନାହିଁ ଏବଂ ଆପଣଙ୍କ ପକ୍ଷରୁ ସ୍ୱାସ୍ଥ୍ୟକର୍ମୀ କିମ୍ବା ଜରୁରୀକାଳୀନ ସେବାକୁ ଯୋଗାଯୋଗ କରିପାରେ ନାହିଁ। କଣ କରିବେ ଜାଣିବାକୁ ଏବେ ଆପଣଙ୍କ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର ସହ ଯୋଗାଯୋଗ କରନ୍ତୁ। ଜରୁରୀ ପରିସ୍ଥିତି ବୋଲି ଲାଗିଲେ, ଭାରତରେ 112 କୁ କଲ୍ କରନ୍ତୁ କିମ୍ବା ନିକଟସ୍ଥ ଜରୁରୀକାଳୀନ ବିଭାଗକୁ ଯାଆନ୍ତୁ।",
    guidanceTitle: "ସ୍ୱାସ୍ଥ୍ୟ ଦଳର ନିର୍ଦ୍ଦେଶ",
    noGuidanceTitle: "ସ୍ୱାସ୍ଥ୍ୟ ଦଳର ନିର୍ଦ୍ଦେଶ ଲେଖାଯାଇନାହିଁ",
    noGuidanceBody:
      "ଏହି ମାମଲା ସମ୍ପୂର୍ଣ୍ଣ ବୋଲି ଦେଖାଯାଉଛି, କିନ୍ତୁ ପରବର୍ତ୍ତୀ ପଦକ୍ଷେପ ଏଠାରେ ଦିଆଯାଇନାହିଁ। କଣ କରିବେ ଜାଣିବା ପାଇଁ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର ସହିତ ଯୋଗାଯୋଗ କରନ୍ତୁ। ଜରୁରୀ ପରିସ୍ଥିତିରେ ସ୍ଥାନୀୟ ଜରୁରୀକାଳୀନ ନମ୍ବରକୁ ଫୋନ୍ କରନ୍ତୁ କିମ୍ବା ନିକଟସ୍ଥ ଜରୁରୀକାଳୀନ ବିଭାଗକୁ ଯାଆନ୍ତୁ।",
    messagingPaused: "ସ୍ୱାସ୍ଥ୍ୟ ଦଳ ଏହି ମାମଲା ସମୀକ୍ଷା କରୁଥିବାରୁ ବାର୍ତ୍ତା ପଠାଇବା ବନ୍ଦ ଅଛି।",
    disclaimer:
      "କେବଳ କୃତ୍ରିମ ଡେମୋ ତଥ୍ୟ। ଏହି ସହାୟକ ରୋଗ ନିର୍ଣ୍ଣୟ କିମ୍ବା ଚିକିତ୍ସା ପରାମର୍ଶ ଦିଏ ନାହିଁ।",
  },
} satisfies Record<Locale, Record<string, string>>;

export type PatientCopy = (typeof patientTranslations)["en"];

export function getPatientCopy(locale: Locale): PatientCopy {
  return patientTranslations[locale];
}

export default translations;
