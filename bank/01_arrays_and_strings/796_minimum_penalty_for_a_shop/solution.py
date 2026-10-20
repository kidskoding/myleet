def best_closing_time(customers: str) -> int:
    score = best_score = best_hour = 0
    for i, ch in enumerate(customers):
        score += 1 if ch == "Y" else -1
        if score > best_score:
            best_score = score
            best_hour = i + 1
    return best_hour
