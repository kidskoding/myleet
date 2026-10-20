from collections import Counter


class Encrypter:
    def __init__(self, keys: list[str], values: list[str], dictionary: list[str]) -> None:
        self.code = dict(zip(keys, values))
        self.counts = Counter(self.encrypt(word) for word in dictionary)

    def encrypt(self, word1: str) -> str:
        parts = []
        for ch in word1:
            if ch not in self.code:
                return ""
            parts.append(self.code[ch])
        return "".join(parts)

    def decrypt(self, word2: str) -> int:
        return self.counts.get(word2, 0) if word2 else 0
