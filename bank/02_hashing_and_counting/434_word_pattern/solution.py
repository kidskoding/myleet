def word_pattern(pattern: str, s: str) -> bool:
    # Time: O(n + len(s)).
    # Space: O(n).
    words = s.split()
    if len(words) != len(pattern):
        return False
    to_word: dict[str, str] = {}
    to_char: dict[str, str] = {}
    for ch, w in zip(pattern, words):
        if to_word.setdefault(ch, w) != w or to_char.setdefault(w, ch) != ch:
            return False
    return True
