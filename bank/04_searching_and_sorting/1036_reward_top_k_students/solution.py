def top_students(
    positive_feedback: list[str],
    negative_feedback: list[str],
    report: list[str],
    student_id: list[int],
    k: int,
) -> list[int]:
    positive = set(positive_feedback)
    negative = set(negative_feedback)
    scored = []
    for text, sid in zip(report, student_id):
        points = 0
        for word in text.split():
            if word in positive:
                points += 3
            elif word in negative:
                points -= 1
        scored.append((-points, sid))
    scored.sort()
    return [sid for _, sid in scored[:k]]
