def remove_occurrences(s: str, part: str) -> str:
    stack: list[str] = []
    m = len(part)
    for ch in s:
        stack.append(ch)
        if len(stack) >= m and "".join(stack[-m:]) == part:
            del stack[-m:]
    return "".join(stack)
