def to_hexspeak(num: str) -> str:
    text = format(int(num), "X").replace("0", "O").replace("1", "I")
    return text if set(text) <= set("ABCDEFIO") else "ERROR"
