import sys
import json
import os
import re
import hashlib
from datetime import datetime
from mempalace.llm_client import get_provider
from mempalace.config import MempalaceConfig, sanitize_name, sanitize_content
from mempalace.knowledge_graph import KnowledgeGraph
from mempalace.backends.registry import get_backend

# Configuration
CONFIG = MempalaceConfig()
PALACE_PATH = CONFIG.palace_path
KG = KnowledgeGraph(PALACE_PATH)


def slugify(text):
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text).strip("-")
    return text[:50]


def get_llm():
    # Use Ollama as default cheap provider if available
    provider_name = os.environ.get("MEMPAL_LLM_PROVIDER", "ollama")
    model_name = os.environ.get("MEMPAL_LLM_MODEL", "qwen3:0.6b")
    try:
        p = get_provider(provider_name, model_name)
        ok, msg = p.check_available()
        if not ok:
            if provider_name == "ollama":
                # Gracefully degrade if ollama is not reachable
                return None
        return p
    except Exception:
        alt_provider = os.environ.get("MEMPAL_LLM_FALLBACK_PROVIDER")
        if alt_provider:
            try:
                return get_provider(
                    alt_provider, os.environ.get("MEMPAL_LLM_FALLBACK_MODEL", "gpt-4o-mini")
                )
            except Exception:
                return None
        return None


def detect_signals(message):
    if not message or len(message.strip()) < 5:
        return None

    # Skip operational messages
    operational_patterns = [
        r"^(ok|thanks|thank you|do it|done|yes|no|y|n|cool|got it|help|restart|status|tasks|logs|stats|clear)\.?$",
        r"^\s*$",
    ]
    if any(re.match(p, message.strip().lower()) for p in operational_patterns):
        return None

    llm = get_llm()
    if not llm:
        return None

    system_prompt = """You are Signal Detector (v1.0.0), a lightweight sub-agent for Kyra.
Extract original thinking and entity mentions from the message.

1. Original Thinking: User's novel ideas, observations, theses, frameworks. Capture EXACT phrasing.
2. Entities: People, Companies, Media References.
3. Concepts: World concepts referenced.
4. Ideas: Product/business ideas.

Return JSON only:
{
  "originals": [{"text": "original phrasing", "slug": "slug-name", "context": "brief context"}],
  "entities": [{"name": "Canonical Name", "type": "person|company|media", "context": "how they were mentioned"}],
  "concepts": [{"name": "Concept Name", "slug": "slug-name"}],
  "ideas": [{"text": "original phrasing", "slug": "slug-name"}]
}
"""
    try:
        resp = llm.classify(system_prompt, message, json_mode=True)
        return json.loads(resp.text)
    except Exception:
        # Don't log full error to stdout to keep Signal Logging clean
        return None


def add_to_palace(wing, room, content):
    try:
        wing = sanitize_name(wing, "wing")
        room = sanitize_name(room, "room")
        content = sanitize_content(content)

        backend = get_backend("chroma")
        col = backend.get_collection(PALACE_PATH, CONFIG.collection_name, create=True)

        drawer_id = f"drawer_{wing}_{room}_{hashlib.sha256((wing + room + content).encode()).hexdigest()[:24]}"

        existing = col.get(ids=[drawer_id])
        if existing and existing.get("ids"):
            return drawer_id

        col.upsert(
            documents=[content],
            ids=[drawer_id],
            metadatas=[
                {
                    "wing": wing,
                    "room": room,
                    "added_by": "signal-detector",
                    "ts": datetime.now().timestamp(),
                }
            ],
        )
        return drawer_id
    except Exception:
        return None


def process_signals(message, signals):
    if not signals:
        return "Signals: 0 ideas, 0 entities, 0 facts (skipped: operational)"

    ideas_count = 0
    entities_count = 0
    facts_count = 0

    captured_originals = []
    captured_entities = []

    # 1. Process Originals, Concepts, Ideas
    for category, wing in [
        ("originals", "originals"),
        ("concepts", "concepts"),
        ("ideas", "ideas"),
    ]:
        items = signals.get(category, [])
        for item in items:
            text = item.get("text") or item.get("name")
            if not text:
                continue
            slug = item.get("slug") or slugify(text)
            content = f"## {text}\n\nCaptured from message: \"{message}\"\n\nContext: {item.get('context', 'N/A')}\n\nDate: {datetime.now().isoformat()}"

            drawer_id = add_to_palace(wing, slug, content)
            if drawer_id:
                captured_originals.append({"wing": wing, "room": slug, "title": text})
                ideas_count += 1

    # 2. Process Entities
    for entity in signals.get("entities", []):
        name = entity.get("name")
        if not name:
            continue
        etype = entity.get("type", "uncertain")
        context = entity.get("context", "")

        wing = "people" if etype == "person" else "companies" if etype == "company" else "media"
        slug = slugify(name)

        try:
            KG.add_entity(name, etype)
            KG.add_triple(
                name,
                "mentioned_in",
                f"msg_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                valid_from=datetime.now().strftime("%Y-%m-%d"),
            )
            entities_count += 1
            captured_entities.append({"name": name, "wing": wing, "slug": slug, "context": context})
        except Exception:
            continue

    # 3. Iron Law Back-linking
    today = datetime.now().strftime("%Y-%m-%d")
    for original in captured_originals:
        for entity in captured_entities:
            if (
                entity["name"].lower() in message.lower()
                or entity["name"].lower() in original["title"].lower()
            ):
                try:
                    target_path = f"{original['wing']}/{original['room']}"
                    KG.add_triple(
                        entity["name"],
                        "referenced_in",
                        target_path,
                        valid_from=today,
                        confidence=0.9,
                    )
                    facts_count += 1
                except Exception:
                    continue

    summary = f"Signals: {ideas_count} ideas, {entities_count} entities, {facts_count} facts"
    return summary


def main():
    if len(sys.argv) < 2:
        sys.exit(0)

    message = " ".join(sys.argv[1:])
    signals = detect_signals(message)
    summary = process_signals(message, signals)
    print(summary)


if __name__ == "__main__":
    main()
