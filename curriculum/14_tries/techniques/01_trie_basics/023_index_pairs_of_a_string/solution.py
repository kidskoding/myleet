from __future__ import annotations


class _TrieNode:
    def __init__(self) -> None:
        self.children: dict[str, _TrieNode] = {}
        self.is_word: bool = False


def index_pairs(text: str, words: list[str]) -> list[list[int]]:
    # Problem 23: Index Pairs of a String
    # Time: O(|text| * max_word_len + total characters in words)
    # Space: O(total characters in words)

    root = _TrieNode()
    for word in words:
        node = root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = _TrieNode()
            node = node.children[ch]
        node.is_word = True

    pairs: list[list[int]] = []
    n = len(text)
    for i in range(n):
        node = root
        for j in range(i, n):
            ch = text[j]
            if ch not in node.children:
                break
            node = node.children[ch]
            if node.is_word:
                pairs.append([i, j])
    return pairs
