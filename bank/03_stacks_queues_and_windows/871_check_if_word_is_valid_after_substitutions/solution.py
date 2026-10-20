def is_valid(s: str) -> bool:
    stack: list[str] = []
    for ch in s:
        stack.append(ch)
        if stack[-3:] == ["a", "b", "c"]:
            del stack[-3:]
    return not stack
