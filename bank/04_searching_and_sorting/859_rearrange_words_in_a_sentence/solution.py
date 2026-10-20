def arrange_words(text: str) -> str:
    words = sorted(text.lower().split(), key=len)
    return " ".join(words).capitalize()
