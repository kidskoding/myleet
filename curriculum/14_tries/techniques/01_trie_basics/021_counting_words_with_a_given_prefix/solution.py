from __future__ import annotations


class _TrieNode:
    def __init__(self) -> None:
        self.children: dict[str, _TrieNode] = {}
        self.count: int = 0


def prefix_count(words: list[str], pref: str) -> int:
    # Problem 21: Counting Words With a Given Prefix
    # Time: O(total characters in words + |pref|)
    # Space: O(total characters in words)

    root = _TrieNode()
    for word in words:
        node = root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = _TrieNode()
            node = node.children[ch]
            node.count += 1

    node = root
    for ch in pref:
        if ch not in node.children:
            return 0
        node = node.children[ch]
    return node.count
