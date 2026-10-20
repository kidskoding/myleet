def nearest_palindromic(n: str) -> str:
    length, value = len(n), int(n)
    candidates = {10 ** (length - 1) - 1, 10**length + 1}
    half = int(n[: (length + 1) // 2])
    for left in (half - 1, half, half + 1):
        text = str(left)
        mirrored = text + (text[-2::-1] if length % 2 else text[::-1])
        candidates.add(int(mirrored))
    candidates.discard(value)
    return str(min(candidates, key=lambda c: (abs(c - value), c)))
