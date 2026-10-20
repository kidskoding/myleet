def sort_the_students(score: list[list[int]], k: int) -> list[list[int]]:
    return sorted(score, key=lambda row: row[k], reverse=True)
