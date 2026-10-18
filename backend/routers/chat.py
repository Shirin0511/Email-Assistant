from fastapi import APIRouter, Depends, HTTPException
from openai import OpenAIError
from sqlalchemy.orm import Session

from database import get_db
from schemas import ChatRequest, ChatResponse
from services.rag import answer_question


router = APIRouter(prefix = "/chat", tags=["chat"])


@router.post("", response_model = ChatResponse)
def chat(payload:ChatRequest, db:Session = Depends(get_db)):
    
    if not payload.question.strip():
        return HTTPException(status_code= 422, detail="Question cannot be empty")

    try:
        result =  answer_question(db, payload.question, payload.history)

    except OpenAIError as exc:
        raise HTTPException(
            status_code = 502, detail = f"LLM Request failed: {exc}"
        )  from exc

    except ValueError as exc:
        raise HTTPException(
            status_code = 502, detail= f"Could not parse model output: {exc}"
        )

    return ChatResponse(**result)

