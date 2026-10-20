from collections import defaultdict


def _abbreviate(word: str, prefix: int) -> str:
    short = word[:prefix] + str(len(word) - prefix - 1) + word[-1]
    return short if len(short) < len(word) else word


def _common_prefix(a: str, b: str) -> int:
    i = 0
    while i < len(a) and a[i] == b[i]:
        i += 1
    return i


def words_abbreviation(words: list[str]) -> list[str]:
    groups: dict[tuple[int, str, str], list[int]] = defaultdict(list)
    for i, word in enumerate(words):
        groups[(len(word), word[0], word[-1])].append(i)
    answer = [""] * len(words)
    for indices in groups.values():
        indices.sort(key=lambda i: words[i])
        for pos, i in enumerate(indices):
            shared = 0
            if pos > 0:
                shared = max(shared, _common_prefix(words[i], words[indices[pos - 1]]))
            if pos + 1 < len(indices):
                shared = max(shared, _common_prefix(words[i], words[indices[pos + 1]]))
            answer[i] = _abbreviate(words[i], shared + 1)
    return answer
