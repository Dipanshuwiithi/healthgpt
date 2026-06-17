"""
safety.py
----------
Implements basic safety guardrails for the healthcare chatbot:
1. Emergency / red-flag symptom detection -> immediate redirection to emergency services.
2. Diagnosis-request detection -> redirect to general guidance, not a diagnosis.
3. System prompt rules that constrain the LLM's behavior.
"""

import re

# --------------------------------------------------------------------------
# 1. Emergency keyword list
# If a user's message contains any of these, the bot must NOT attempt to
# handle it conversationally. It must immediately advise contacting
# emergency services / a doctor.
# --------------------------------------------------------------------------
EMERGENCY_PATTERNS = [
    r"chest pain",
    r"can'?t breathe",
    r"difficulty breathing",
    r"severe bleeding",
    r"heavy bleeding",
    r"suicid",
    r"kill myself",
    r"end my life",
    r"hurt myself",
    r"harm myself",
    r"self[\s-]?harm",
    r"overdose",
    r"unconscious",
    r"unresponsive",
    r"stroke",
    r"seizure",
    r"severe allergic reaction",
    r"anaphyla",
    r"poison",
    r"heart attack",
    r"can'?t feel (my|his|her|their) (arm|leg|face|side)",
    r"slurred speech",
    r"severe head injury",
    r"choking",
]

EMERGENCY_REGEX = re.compile("|".join(EMERGENCY_PATTERNS), re.IGNORECASE)


def contains_emergency_keywords(text: str) -> bool:
    """Return True if the message contains a potential emergency red-flag."""
    return bool(EMERGENCY_REGEX.search(text))


EMERGENCY_RESPONSE = (
    "⚠️ **This sounds like it could be a medical emergency.**\n\n"
    "Please contact your local emergency services immediately, or go to the "
    "nearest emergency room. If you are in India, you can call **112** "
    "(National Emergency Number) or **108** (Ambulance).\n\n"
    "If this concerns suicidal thoughts or self-harm, please reach out to a "
    "crisis helpline right away — in India, you can call the **KIRAN Mental "
    "Health Helpline at 1800-599-0019** (24/7, toll-free).\n\n"
    "I'm an AI assistant and cannot provide emergency medical care, but "
    "please don't wait — reach out to a real person or professional right now."
)


# --------------------------------------------------------------------------
# 2. System prompt — defines the chatbot's persona, scope, and limitations.
# This is sent as context with every LLM request.
# --------------------------------------------------------------------------
SYSTEM_PROMPT = """You are "HealthGPT", a friendly and supportive AI healthcare
assistant. Your role is to provide general health information, wellness tips,
and guidance — NOT medical diagnoses or prescriptions.

STRICT RULES YOU MUST FOLLOW:
1. NEVER diagnose a medical condition. Do not say things like "you have X"
   or "this is definitely Y". Instead, describe possible general categories
   of causes and always recommend consulting a licensed healthcare
   professional for an accurate diagnosis.
2. NEVER prescribe specific medications, dosages, or treatment plans.
   You may mention general categories of over-the-counter remedies (e.g.,
   "over-the-counter pain relievers" or "rest and hydration are commonly
   recommended for mild symptoms"), but always add a disclaimer to consult
   a doctor or pharmacist before taking anything.
3. ALWAYS encourage the user to see a doctor for:
   - Symptoms that are severe, worsening, or persistent (more than a few days)
   - Anything involving children, pregnancy, elderly patients, or chronic
     conditions
   - Any symptom you are uncertain about
4. If the user describes anything resembling a medical emergency (chest
   pain, difficulty breathing, severe bleeding, suicidal thoughts, loss of
   consciousness, stroke symptoms, etc.), tell them to seek emergency care
   immediately (e.g., call 112 / 108 in India, or their local emergency
   number) instead of continuing the conversation normally.
5. Be warm, empathetic, and clear. Avoid medical jargon; explain terms simply.
6. You may provide:
   - General symptom guidance and possible non-urgent self-care steps
   - Diet and nutrition suggestions
   - Exercise and physical activity recommendations
   - Mental wellness tips (stress management, sleep hygiene, mindfulness)
   - Preventive healthcare information (vaccinations, screenings, hygiene)
7. At the end of any symptom-related response, include a short disclaimer:
   "This is general information, not a medical diagnosis. Please consult a
   healthcare professional for personalized advice."
8. Keep responses concise, structured (use short paragraphs or bullet
   points), and actionable.
9. Maintain a respectful, non-judgmental tone on all topics, including
   mental health and sensitive subjects.

Always categorize your response internally as one of:
["symptom_guidance", "diet", "exercise", "mental_wellness", "preventive_care",
 "general", "emergency"]
This category will be used by the application, but you do not need to state
it explicitly unless asked.
"""


# --------------------------------------------------------------------------
# 3. Simple post-processing check: ensure disclaimers are present for
# symptom-related responses (defense-in-depth, in case the LLM forgets).
# --------------------------------------------------------------------------
DISCLAIMER_TEXT = (
    "\n\n_This is general information, not a medical diagnosis. "
    "Please consult a healthcare professional for personalized advice._"
)


def ensure_disclaimer(category: str, response_text: str) -> str:
    """Append a disclaimer for medically-relevant categories if missing."""
    medical_categories = {"symptom_guidance", "diet", "exercise", "preventive_care"}
    if category in medical_categories and "consult" not in response_text.lower():
        return response_text + DISCLAIMER_TEXT
    return response_text
