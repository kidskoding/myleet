from collections import defaultdict


def num_matching_subseq(s: str, words: list[str]) -> int:
    waiting: dict[str, list[tuple[str, int]]] = defaultdict(list)
    for word in words:
        waiting[word[0]].append((word, 0))
    matched = 0
    for ch in s:
        bucket = waiting.pop(ch, [])
        for word, idx in bucket:
            idx += 1
            if idx == len(word):
                matched += 1
            else:
                waiting[word[idx]].append((word, idx))
    return matched
