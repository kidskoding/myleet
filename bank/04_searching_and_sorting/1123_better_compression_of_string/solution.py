def better_compression(compressed: str) -> str:
    totals = [0] * 26
    i = 0
    while i < len(compressed):
        letter = ord(compressed[i]) - ord("a")
        i += 1
        count = 0
        while i < len(compressed) and compressed[i].isdigit():
            count = count * 10 + int(compressed[i])
            i += 1
        totals[letter] += count
    return "".join(f"{chr(ord('a') + c)}{n}" for c, n in enumerate(totals) if n)
