def count_valid_words(sentence: str) -> int:
    def valid(token: str) -> bool:
        hyphens = 0
        for i, ch in enumerate(token):
            if ch.isdigit():
                return False
            if ch == "-":
                hyphens += 1
                if hyphens > 1 or i == 0 or i == len(token) - 1:
                    return False
                if not (token[i - 1].isalpha() and token[i + 1].isalpha()):
                    return False
            elif ch in "!.," and i != len(token) - 1:
                return False
        return True

    return sum(1 for token in sentence.split() if valid(token))
