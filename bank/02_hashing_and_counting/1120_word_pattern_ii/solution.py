def word_pattern_match(pattern: str, s: str) -> bool:
    mapping: dict[str, str] = {}
    taken: set[str] = set()

    def match(pi: int, si: int) -> bool:
        if pi == len(pattern):
            return si == len(s)
        if len(pattern) - pi > len(s) - si:
            return False
        letter = pattern[pi]
        if letter in mapping:
            piece = mapping[letter]
            return s.startswith(piece, si) and match(pi + 1, si + len(piece))
        for end in range(si + 1, len(s) + 1):
            piece = s[si:end]
            if piece in taken:
                continue
            mapping[letter] = piece
            taken.add(piece)
            if match(pi + 1, end):
                return True
            del mapping[letter]
            taken.remove(piece)
        return False

    return match(0, 0)
