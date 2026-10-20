from collections import Counter


def shortest_substrings(arr: list[str]) -> list[str]:
    def subs(w: str) -> set[str]:
        return {w[i:j] for i in range(len(w)) for j in range(i + 1, len(w) + 1)}

    owners: Counter[str] = Counter()
    for w in arr:
        owners.update(subs(w))
    out: list[str] = []
    for w in arr:
        found = ""
        for size in range(1, len(w) + 1):
            cands = sorted(w[i : i + size] for i in range(len(w) - size + 1) if owners[w[i : i + size]] == 1)
            if cands:
                found = cands[0]
                break
        out.append(found)
    return out
