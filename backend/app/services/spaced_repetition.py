from datetime import date, timedelta


LEITNER_INTERVALS = {
    1: 1,
    2: 2,
    3: 4,
    4: 8,
    5: 16
}


def calculate_next_review(current_box: int, is_correct: bool) -> tuple[int, date]:
    if is_correct:
        new_box = min(current_box + 1, 5)
    else:
        new_box = 1
    
    days_interval = LEITNER_INTERVALS[new_box]
    next_review = date.today() + timedelta(days=days_interval)
    
    return new_box, next_review


def get_box_info(box: int) -> dict:
    return {
        "box": box,
        "interval_days": LEITNER_INTERVALS.get(box, 1),
        "description": f"Review every {LEITNER_INTERVALS.get(box, 1)} day(s)"
    }


def get_mastery_level(box: int) -> str:
    mastery_levels = {
        1: "New",
        2: "Learning",
        3: "Familiar",
        4: "Proficient",
        5: "Mastered"
    }
    return mastery_levels.get(box, "Unknown")
