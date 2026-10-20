def plates_between_candles(s: str, queries: list[list[int]]) -> list[int]:
    n = len(s)
    plates = [0] * (n + 1)
    for i, ch in enumerate(s):
        plates[i + 1] = plates[i] + (ch == "*")
    left_candle = [-1] * n
    last = -1
    for i, ch in enumerate(s):
        if ch == "|":
            last = i
        left_candle[i] = last
    right_candle = [n] * n
    last = n
    for i in range(n - 1, -1, -1):
        if s[i] == "|":
            last = i
        right_candle[i] = last
    answer = []
    for lo, hi in queries:
        start, end = right_candle[lo], left_candle[hi]
        answer.append(plates[end] - plates[start] if start < end else 0)
    return answer
