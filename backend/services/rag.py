from sqlalchemy.orm import Session

from config import settings
from models import Email
from schemas import Citation, GeneratedAnswer
from services.llm import client
from services import vector_store

# How many emails to put in front of the model. Enough to answer a broad
# question, small enough to stay cheap.
MAX_CONTEXT_EMAILS = 5

NO_EVIDENCE_ANSWER = (
    "I could not find any emails relevant to that question, so I have not "
    "tried to answer it. Try rephrasing, or asking about something else in "
    "your inbox."
)

RESOLVER_PROMPT = (
    "You rewrite follow-up questions into standalone search queries.\n\n"
    "Given a conversation and the user's latest question, output a single "
    "search query that captures what they are asking, with pronouns and "
    "references resolved using the conversation.\n\n"
    "Rules:\n"
    "- Output the query only. No preamble, no quotes, no explanation.\n"
    "- If the question already stands alone, output it unchanged.\n"
    "- Keep it short; it is used for semantic search, not as a sentence."
)

ANSWER_PROMPT = (
    "You answer questions about the user's email, using only the numbered "
    "emails provided as evidence.\n\n"
    "Reply with JSON only and nothing else, in exactly this form:\n"
    '{"answer": "...", "sources": [1, 2]}\n\n'
    "Rules:\n"
    "- Use ONLY the evidence. Never use outside knowledge, and never invent "
    "details that are not in the emails.\n"
    "- Cite with bracketed markers in the answer text, e.g. "
    '"John needs the proposal by Friday [1]."\n'
    "- sources must list the markers you actually cited.\n"
    "- If the evidence does not answer the question, say so plainly and "
    "return an empty sources list.\n"
    "- Be concise. Two or three sentences unless more is genuinely needed."
)


def _parse(raw: str) -> GeneratedAnswer:
    """Turn the model's text into a validated answer, or raise."""
    text = raw.strip()

    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1] if len(parts)>1 else text
        if text.lstrip().startswith("json"):
            text = text.lstrip()[4:]


    return GeneratedAnswer.model_validate_json(text.strip())


def _complete(system:str, user:str, max_tokens: int = 700) -> str:

    """One chat call. Raises on an empty or truncated response."""
    response = client.chat.completions.create(
        model = settings.llm_model,
        messages =[
            {"role":"system", "content":system},
            {"role":"user", "content":user}
        ], 
        max_tokens=max_tokens,
        temperature = 0
    )

    choice = response.choices[0]
    if choice.finish_reason == "length":
        raise ValueError(
            "Model output was cut off before it finished - raise Max Tokens"
        )


    text = (choice.message.content or "").strip()

    if not text:
        raise ValueError("The model returned empty response")
    return text


def resolve_question(question: str, history: list) -> str:
    """Turn a follow-up into a standalone search query.

    With no history there is nothing to resolve, so this skips the LLM call
    entirely -- which is the common case for a first question.
    """

    if not history:
        return question

    transcript = "\n".join(f"{m.role} : {m.content}" for m in history[-6:])
    user_prompt = f"Conversation : {transcript} \n\n Latest Question : {question}"

    return _complete(RESOLVER_PROMPT, user_prompt, max_tokens=300)


def build_context(hits: list[tuple[Email, float]]) -> str:
    """Format retrieved emails as numbered evidence blocks."""

    blocks =[]

    for index, (email, score) in enumerate(hits, start=1):
        blocks.append(
            f"[{index}]\n"
            f"Email Id: {email.id}\n"
            f"From: {email.sender_name} <{email.sender_email}>\n"
            f"Date : {email.timestamp:%A, %d %B %Y}\n"
            f"Subject : {email.subject}\n"
            f"Body: \n{email.body}"
        )

    return "\n\n---\n\n".join(blocks)



def answer_question(db: Session, question:str, history:list)-> dict:
    """Run the full pipeline. Returns the fields of a ChatResponse."""

    # 1. Resolve follow-ups against the conversation.
    resolved = resolve_question(question, history)

    print("Resolved Question is: ",resolved)

    # 2. Retrieve. search() already applies the relevance threshold, so an
    #    empty list means nothing cleared the bar.
    #    >>> Reranking goes here later: retrieve a wider pool, rerank it,
    #        then threshold on the reranker's scores instead.

    hits = vector_store.search(db, resolved, MAX_CONTEXT_EMAILS)

    if hits:
        print("The hits are:")
        for e,s in hits:
            print(f"{s:.3f}  {e.id}  {e.subject}")

    # 3. No evidence means no answer. Return without calling the model --
    #    an LLM given nothing to work from will invent something.
    if not hits:
        return {
            "answer": NO_EVIDENCE_ANSWER,
            "citations" : [],
            "resolved_query": resolved
        }

    # 4. Build the evidence and ask.

    transcript = "\n".join(f"{m.role}:{m.content}" for m in history[-6:])
    user_prompt = (
        (f"Conversation so far: \n{transcript}\n\n" if history else "")
        + f"Evidence: \n\n {build_context(hits)}\n\n"
        + f"Question: {question}"
    )

    generated = _parse(_complete(ANSWER_PROMPT, user_prompt))


    # 5. Map the markers the model cited back to real emails, ignoring any
    #    it invented.

    citations = []
    for marker in generated.sources:
        if 1 <= marker <= len(hits):
            email = hits[marker-1][0]
            citations.append(
                Citation(
                    marker = marker,
                    email_id = email.id,
                    subject = email.subject,
                    sender_name = email.sender_name,
                    timestamp = email.timestamp
                )
            )

    return {
        "answer" : generated.answer,
        "citations" : citations,
        "resolved_query" : resolved,
    }        
    