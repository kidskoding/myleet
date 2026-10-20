def report_spam(message: list[str], banned_words: list[str]) -> bool:
    banned = set(banned_words)
    hits = 0
    for word in message:
        if word in banned:
            hits += 1
            if hits == 2:
                return True
    return False
