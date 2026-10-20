def roman_to_int(s: str) -> int:
    # Time: O(n).
    # Space: O(1).
    values = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}
    total = 0
    for i, ch in enumerate(s):
        v = values[ch]
        if i + 1 < len(s) and values[s[i + 1]] > v:
            total -= v
        else:
            total += v
    return total
