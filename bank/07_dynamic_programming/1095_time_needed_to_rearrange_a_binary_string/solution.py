def seconds_to_remove_occurrences(s: str) -> int:
    zeros = 0
    seconds = 0
    for ch in s:
        if ch == "0":
            zeros += 1
        elif zeros:
            seconds = max(seconds + 1, zeros)
    return seconds
