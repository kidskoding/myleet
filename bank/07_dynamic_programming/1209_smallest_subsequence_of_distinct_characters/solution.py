def smallest_subsequence(s: str) -> str:
    last = {ch: i for i, ch in enumerate(s)}
    stack: list[str] = []
    seen: set[str] = set()
    for i, ch in enumerate(s):
        if ch in seen:
            continue
        while stack and ch < stack[-1] and last[stack[-1]] > i:
            seen.remove(stack.pop())
        stack.append(ch)
        seen.add(ch)
    return "".join(stack)
