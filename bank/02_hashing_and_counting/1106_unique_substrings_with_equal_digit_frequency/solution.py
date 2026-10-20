def equal_digit_frequency(s: str) -> int:
    children: list[dict[str, int]] = [{}]
    counted = [False]
    total = 0
    for start in range(len(s)):
        counts = [0] * 10
        distinct = 0
        highest = 0
        node = 0
        for end in range(start, len(s)):
            digit = ord(s[end]) - ord("0")
            if counts[digit] == 0:
                distinct += 1
            counts[digit] += 1
            highest = max(highest, counts[digit])
            nxt = children[node].get(s[end])
            if nxt is None:
                nxt = len(children)
                children[node][s[end]] = nxt
                children.append({})
                counted.append(False)
            node = nxt
            if highest * distinct == end - start + 1 and not counted[node]:
                counted[node] = True
                total += 1
    return total
