"""Turn deadline phrases found in emails into real dates.

Pure Python: no LLM call. Every phrase is resolved relative to the date the
email was sent, never to today -- an email from September saying "tomorrow"
means the day after it was sent, not the day after you happen to read it.
"""

import re
from datetime import date, timedelta

WEEKDAYS = {
    "monday": 0,
    "tuesday": 1,
    "wednesday": 2,
    "thursday": 3,
    "friday": 4,
    "saturday": 5,
    "sunday": 6,
}

# Phrases that mean "the day the email was sent".
SAME_DAY = {
    "today",
    "eod",
    "end of day",
    "cob",
    "close of business",
    "asap",
    "immediately",
    "right away",
    "now",
}

MONTHS = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11,
    "december": 12,
}

# Leading words that add nothing: "by Friday", "due on Monday".
# Deliberately excludes "end of", which is meaningful in "end of week".
_NOISE = re.compile(r"^(by|before|due|on|at|the|no later than|nlt)\s+")


def _strip_noise(text: str) -> str:
    previous = None
    while previous != text:
        previous = text
        text = _NOISE.sub("", text).strip()
    return text


def _next_weekday(
    anchor: date,
    target: int,
    next_week: bool = False,
    allow_today: bool = False,
) -> date:
    """The next occurrence of a weekday, normally strictly after the anchor."""
    days_ahead = (target - anchor.weekday()) % 7
    if days_ahead == 0 and not allow_today:
        days_ahead = 7  # "Friday" said on a Friday means the following Friday
    result = anchor + timedelta(days=days_ahead)
    if next_week and result.isocalendar()[1] == anchor.isocalendar()[1]:
        # "next Friday" when Friday is still this week means the one after.
        result += timedelta(days=7)
    return result


def _end_of_month(anchor: date) -> date:
    first_of_next = (anchor.replace(day=28) + timedelta(days=4)).replace(day=1)
    return first_of_next - timedelta(days=1)


def resolve_deadline(text: str | None, sent_on: date) -> date | None:
    """Resolve a deadline phrase to a date, or None if it cannot be read."""
    if not text:
        return None

    t = _strip_noise(text.strip().lower().rstrip(".,!"))

    if t in SAME_DAY:
        return sent_on
    if t == "tomorrow":
        return sent_on + timedelta(days=1)
    if t in {"day after tomorrow", "overmorrow"}:
        return sent_on + timedelta(days=2)
    if t in {"end of week", "eow", "this week"}:
        # Said on a Friday, "end of week" means that same day.
        return _next_weekday(sent_on, 4, allow_today=True)
    if t == "next week":
        return _next_weekday(sent_on, 0, next_week=True)  # Monday
    if t in {"end of month", "eom"}:
        return _end_of_month(sent_on)

    # "in 3 days" / "within 2 weeks"
    match = re.fullmatch(r"(?:in|within)\s+(\d+)\s+(day|week)s?", t)
    if match:
        count = int(match.group(1))
        step = 7 if match.group(2) == "week" else 1
        return sent_on + timedelta(days=count * step)

    # "next monday" / "monday"
    match = re.fullmatch(r"(next\s+)?(\w+day)", t)
    if match and match.group(2) in WEEKDAYS:
        return _next_weekday(sent_on, WEEKDAYS[match.group(2)], bool(match.group(1)))

    # "5 october" / "5 october 2026" / "october 5"
    match = re.fullmatch(r"(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)(?:\s+(\d{4}))?", t)
    if match and match.group(2) in MONTHS:
        day, month = int(match.group(1)), MONTHS[match.group(2)]
        year = int(match.group(3)) if match.group(3) else sent_on.year
        return _safe_date(year, month, day, sent_on)

    match = re.fullmatch(r"(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?", t)
    if match and match.group(1) in MONTHS:
        month, day = MONTHS[match.group(1)], int(match.group(2))
        year = int(match.group(3)) if match.group(3) else sent_on.year
        return _safe_date(year, month, day, sent_on)

    # "2026-10-05"
    match = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})", t)
    if match:
        return _safe_date(*(int(g) for g in match.groups()), sent_on)

    return None


def _safe_date(year: int, month: int, day: int, sent_on: date) -> date | None:
    try:
        result = date(year, month, day)
    except ValueError:
        return None
    # A bare "5 January" in a December email means next January.
    if result < sent_on and result.year == sent_on.year:
        try:
            return result.replace(year=year + 1)
        except ValueError:
            return None
    return result
