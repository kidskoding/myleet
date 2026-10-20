def sort_string(s: str) -> str:
    counts = [0] * 26
    for ch in s:
        counts[ord(ch) - ord("a")] += 1
    order = list(range(26)) + list(range(25, -1, -1))
    result = []
    while len(result) < len(s):
        for i in order:
            if counts[i]:
                counts[i] -= 1
                result.append(chr(ord("a") + i))
    return "".join(result)
