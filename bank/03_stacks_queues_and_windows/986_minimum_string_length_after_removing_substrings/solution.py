def min_length(s: str) -> int:
    stack: list[str] = []
    for ch in s:
        if stack and stack[-1] + ch in ("AB", "CD"):
            stack.pop()
        else:
            stack.append(ch)
    return len(stack)
