def longest_common_prefix(strs: list[str]) -> str:
    first = strs[0]
    for i, ch in enumerate(first):
        for other in strs[1:]:
            if i == len(other) or other[i] != ch:
                return first[:i]
    return first
