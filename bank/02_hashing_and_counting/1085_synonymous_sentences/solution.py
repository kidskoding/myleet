from itertools import product


def generate_sentences(synonyms: list[list[str]], text: str) -> list[str]:
    parent: dict[str, str] = {}

    def find(x: str) -> str:
        parent.setdefault(x, x)
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for a, b in synonyms:
        parent[find(a)] = find(b)
    groups: dict[str, list[str]] = {}
    for word in list(parent):
        groups.setdefault(find(word), []).append(word)
    choices = []
    for word in text.split():
        if word in parent:
            choices.append(sorted(groups[find(word)]))
        else:
            choices.append([word])
    return sorted(" ".join(combo) for combo in product(*choices))
