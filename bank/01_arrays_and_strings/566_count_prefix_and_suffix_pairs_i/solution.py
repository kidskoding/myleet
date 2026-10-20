def count_prefix_suffix_pairs(words: list[str]) -> int:
    total = 0
    for i, small in enumerate(words):
        for big in words[i + 1 :]:
            if big.startswith(small) and big.endswith(small):
                total += 1
    return total
