"""Ground truth for retrieval evaluation.

must_find   -- missing any of these is a recall failure
acceptable  -- reasonable to return; neither rewarded nor penalised

Drafts are excluded everywhere: SEARCHABLE_FOLDERS covers inbox and sent only,
so email_011 and email_022 can never be retrieved.
"""

EVAL_SET = [
    # (case_id, query, must_find, acceptable)

    # A. Single clear answer -- tests precision
    ("A1", "when do we have team lunch?", {"email_021"}, set()),
    ("A2", "when is my timesheet due?", {"email_006"}, set()),
    ("A3", "when does my password expire?", {"email_023"}, set()),
    ("A4", "what time is the client meeting?", {"email_004"}, set()),
    ("A5", "when is the hackathon registration deadline?", {"email_018"}, set()),
    ("A6", "what time is the generative AI training session?", {"email_009"}, set()),

    # B. Threads -- tests recall across multiple emails
    ("B1", "what's happening with the database migration?", {"email_015", "email_016"}, set()),
    ("B2", "what is the status of the API integration?", {"email_025", "email_026"}, set()),
    ("B3", "what do I need to do for the project proposal?", {"email_001", "email_030"}, {"email_002", "email_003"}),
    ("B4", "what did I say about the risk register?", {"email_019", "email_020"}, set()),
    ("B5", "what feedback did I get on the AI prototype?", {"email_007", "email_008"}, set()),

    # C. Semantic -- little or no keyword overlap
    ("C1", "is there anything about moving our data to a new database?", {"email_015", "email_016"}, set()),
    ("C2", "anything about money or spending?", {"email_010"}, {"email_024", "email_013"}),
    ("C3", "any learning material about RAG?", {"email_027"}, {"email_009", "email_014"}),
    ("C4", "what do I need to prepare before a review?", {"email_012", "email_028"}, {"email_019", "email_004"}),
    ("C5", "who needs something reviewed by me?", {"email_005", "email_019", "email_024"}, {"email_007"}),

    # D. Person-based -- expected to fail until hybrid search exists
    ("D1", "what does Michael Lee want?", {"email_005"}, set()),
    ("D2", "what did Tom Wilson ask about?", {"email_015", "email_016"}, set()),
    ("D3", "what has John Smith sent me?", {"email_001", "email_003", "email_019", "email_030"}, set()),
    ("D4", "anything from the finance team?", {"email_010"}, set()),

    # E. Negatives -- nothing should come back
    ("E1", "what did my dentist say about my appointment?", set(), set()),
    ("E2", "when is my flight to Singapore?", set(), set()),
    ("E3", "what's my salary increment this year?", set(), set()),
    ("E4", "purple elephant xylophone", set(), set()),

    # F. Broad multi-answer -- recall ceiling
    ("F1", "what deadlines do I have coming up?", {"email_006", "email_010", "email_024", "email_030"}, {"email_001", "email_018", "email_012"}),
    ("F2", "what do I owe people?", {"email_001", "email_005", "email_024", "email_028"}, {"email_010", "email_019"}),
]

# Groups excluded from tuning decisions (hybrid-search problem, not threshold).
EXCLUDE_FROM_TUNING = {"D"}
