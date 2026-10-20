def equal_count_substrings(s: str, count: int) -> int:
    n = len(s)
    total = 0
    for unique in range(1, 27):
        width = unique * count
        if width > n:
            break
        freq = [0] * 26
        exact = 0
        for i, ch in enumerate(s):
            c = ord(ch) - 97
            freq[c] += 1
            if freq[c] == count:
                exact += 1
            elif freq[c] == count + 1:
                exact -= 1
            if i >= width:
                o = ord(s[i - width]) - 97
                if freq[o] == count:
                    exact -= 1
                elif freq[o] == count + 1:
                    exact += 1
                freq[o] -= 1
            if i >= width - 1 and exact == unique:
                total += 1
    return total
