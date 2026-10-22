"""Sweep retrieval thresholds against the eval set"""


from database import SessionLocal
from services import vector_store
from services.eval_set import EVAL_SET, EXCLUDE_FROM_TUNING

# Grid to sweep. None means "no relative band" -- absolute floor only.
MIN_SCORES = [0.50, 0.55, 0.60, 0.65]
RELATIVE_BANDS = [None, 0.10, 0.15, 0.20]


TOP_K=10

def apply_threshold(candidates, min_score):

    strong = [(email, score) for email, score in candidates if score >=min_score]

    return strong

def score_case(retrieved_ids, must_find, acceptable):

    """Per-query metrics. None where a metric is undefined."""

    relevant = must_find | acceptable

    recall = len(retrieved_ids & must_find)/ len(must_find) if must_find else None

    precision = len(retrieved_ids & relevant) / len(retrieved_ids) if retrieved_ids else None

    complete = (not(must_find-retrieved_ids)) if must_find else None

    clean = (not retrieved_ids) if not relevant else None

    return recall, precision, complete, clean


def evaluate(db, verbose=False):
    candidates = {
        case_id: vector_store.retrieve_candidates(db,query,TOP_K)
        for case_id, query, _, _ in EVAL_SET
    }

    summary = []

    for min_score in MIN_SCORES:
        recalls, precisions, completes, cleans = [], [], [], []
        per_group = {}

        for case_id, query, must_find, acceptable in EVAL_SET:
            group = case_id[0]
            retrieved = apply_threshold(candidates[case_id],min_score)

            retrieved_ids = {e.id for e,_ in retrieved}

            recall, precision, complete, clean = score_case(
                retrieved_ids, must_find, acceptable
            )

            if verbose:
                missing = sorted(must_find- retrieved_ids)

                print(
                    f"  {case_id} retrieved={len(retrieved):2}"
                    f" recall={'-' if recall is None else f'{recall:.2f}'}"
                    f" missing={missing}"
                )

                # Group D is a hybrid-search problem, not a threshold one.
                if group in EXCLUDE_FROM_TUNING:
                    continue

                if recall is not None:
                    recalls.append(recall)
                    completes.append(1.0 if complete else 0.0)
                    per_group.setdefault(group,[]).append(recall)

                if precision is not None:
                    precisions.append(precision)

                if clean is not None:
                    cleans.append(1.0 if clean else 0.0)

        def mean(xs):
            return sum(xs) / len(xs) if xs else 0.0

        recall_avg, precision_avg = mean(recalls), mean(precisions)

        f1= (
            2 * precision_avg * recall_avg / (precision_avg + recall_avg)
            if (precision_avg + recall_avg)
            else 0.0
        )                    

        summary.append(
                {
                    "min_score": min_score,
                    "recall": recall_avg,
                    "precision": precision_avg,
                    "f1": f1,
                    "complete": mean(completes),
                    "no_answer_clean": mean(cleans),
                    "groups": {g: mean(v) for g, v in sorted(per_group.items())},
                }
            )

    return summary


def print_summary(summary):
    print()
    print(f"{'min':>5} {'band':>5} | {'prec':>5} {'rec':>5} {'F1':>5} "
          f"| {'complete':>8} {'E-clean':>8} | per-group recall")
    print("-" * 92)

    for row in summary:
        groups = "  ".join(f"{g}:{v:.2f}" for g, v in row["groups"].items())
        print(
            f"{row['precision']:5.3f} {row['recall']:5.3f} {row['f1']:5.3f} | "
            f"{row['complete']:8.3f} {row['no_answer_clean']:8.3f} | {groups}"
        )

    # Only settings that never leak on the negative cases are safe to pick.
    safe = [r for r in summary if r["no_answer_clean"] == 1.0]
    print()
    if safe:
        best = max(safe, key=lambda r: r["f1"])
        print("Best F1 among settings with no false positives on E:")
        print(f"   MIN_SCORE={best['min_score']:.2f}"
              f"  (P={best['precision']:.3f} R={best['recall']:.3f} F1={best['f1']:.3f})")
    else:
        print("No setting kept every no-answer query clean.")


if __name__ == "__main__":
    with SessionLocal() as db:
        print_summary(evaluate(db))


            

