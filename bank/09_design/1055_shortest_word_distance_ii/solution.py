from collections import defaultdict


class WordDistance:
    def __init__(self, words_dict: list[str]) -> None:
        self.positions: dict[str, list[int]] = defaultdict(list)
        for i, word in enumerate(words_dict):
            self.positions[word].append(i)

    def shortest(self, word1: str, word2: str) -> int:
        a, b = self.positions[word1], self.positions[word2]
        i = j = 0
        best = float("inf")
        while i < len(a) and j < len(b):
            best = min(best, abs(a[i] - b[j]))
            if a[i] < b[j]:
                i += 1
            else:
                j += 1
        return int(best)
