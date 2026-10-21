from __future__ import annotations


class _TrieNode:
    def __init__(self) -> None:
        self.children: dict[str, _TrieNode] = {}
        self.is_word: bool = False


def min_extra_char(s: str, dictionary: list[str]) -> int:
    # Problem 24: Extra Characters in a String
    # Time: O(n^2 + total dictionary characters)
    # Space: O(n + total dictionary characters)

    root = _TrieNode()
    for word in dictionary:
        node = root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = _TrieNode()
            node = node.children[ch]
        node.is_word = True

    n = len(s)
    dp = [0] * (n + 1)
    for i in range(n - 1, -1, -1):
        best = 1 + dp[i + 1]
        node = root
        for j in range(i, n):
            ch = s[j]
            if ch not in node.children:
                break
            node = node.children[ch]
            if node.is_word:
                best = min(best, dp[j + 1])
        dp[i] = best
    return dp[0]
