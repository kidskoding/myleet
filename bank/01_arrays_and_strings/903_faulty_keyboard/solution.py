from collections import deque


def final_string(s: str) -> str:
    text: deque[str] = deque()
    reversed_view = False
    for ch in s:
        if ch == "i":
            reversed_view = not reversed_view
        elif reversed_view:
            text.appendleft(ch)
        else:
            text.append(ch)
    result = "".join(text)
    return result[::-1] if reversed_view else result
