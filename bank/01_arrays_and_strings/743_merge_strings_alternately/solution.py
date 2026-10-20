def merge_alternately(word1: str, word2: str) -> str:
    shared = min(len(word1), len(word2))
    parts = [a + b for a, b in zip(word1, word2)]
    return "".join(parts) + word1[shared:] + word2[shared:]
