def are_sentences_similar_two(sentence1: list[str], sentence2: list[str], similar_pairs: list[list[str]]) -> bool:
    if len(sentence1) != len(sentence2):
        return False
    parent: dict[str, str] = {}

    def find(x: str) -> str:
        parent.setdefault(x, x)
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for a, b in similar_pairs:
        parent[find(a)] = find(b)
    return all(a == b or find(a) == find(b) for a, b in zip(sentence1, sentence2))
