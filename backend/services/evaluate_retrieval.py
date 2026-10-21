"""Sweep retrieval thresholds against the eval set"""


from database import SessionLocal
from services import vector_store
from services.eval_set import EVAL_SET, EXCLUDE_FROM_TUNING

# Grid to sweep. None means "no relative band" -- absolute floor only.
MIN_SCORES = [0.50, 0.55, 0.60, 0.65]
RELATIVE_BANDS = [None, 0.10, 0.15, 0.20]


TOP_K=10

def apply_threshold(candidates, min_score, relative_band):

    strong = [(email, score) for email, score in candidates if score >=min_score]

    if not strong or relative_band is None:
        return strong

    top_score = strong[0][1]

    return [(e,s) for e,s in strong if s>=top_score-relative_band]


def score_case(retrieved_ids, must_find, acceptable):

    """Per-query metrics. None where a metric is undefined."""

    relevant = must_find | acceptable

    recall = len(retrieved_ids & must_find)/ len(must_find) if must_find else None

    precision = len(retrieved_ids & relevant) / len(retrieved_ids) if retrieved_ids else None

    complete = (not(must_find-retrieved_ids)) if must_find else None

    clean = (not retrieved_ids) if not relevant else None

    return recall, precision, complete, clean


