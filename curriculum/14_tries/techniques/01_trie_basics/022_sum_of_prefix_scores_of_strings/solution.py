from __future__ import annotations


class _TrieNode:
    def __init__(self) -> None:
        self.children: dict[str, _TrieNode] = {}
        self.count: int = 0


def sum_prefix_scores(words: list[str]) -> list[int]:
    # Problem 22: Sum of Prefix Scores of Strings
    # Time: O(total characters in words)
    # Space: O(total characters in words)

    root = _TrieNode()
    for word in words:
        node = root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = _TrieNode()
            node = node.children[ch]
            node.count += 1

    scores: list[int] = []
    for word in words:
        node = root
        total = 0
        for ch in word:
            node = node.children[ch]
            total += node.count
        scores.append(total)
    return scores
