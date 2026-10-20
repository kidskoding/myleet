def count_prefix_suffix_pairs(words: list[str]) -> int:
    children: list[dict[tuple[str, str], int]] = [{}]
    ends = [0]
    total = 0
    for word in words:
        node = 0
        for pair in zip(word, reversed(word)):
            nxt = children[node].get(pair)
            if nxt is None:
                nxt = len(children)
                children[node][pair] = nxt
                children.append({})
                ends.append(0)
            node = nxt
            total += ends[node]
        ends[node] += 1
    return total
