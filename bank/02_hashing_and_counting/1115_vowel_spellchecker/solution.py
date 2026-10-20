def _mask(word: str) -> str:
    return "".join("*" if ch in "aeiou" else ch for ch in word)


def spellchecker(wordlist: list[str], queries: list[str]) -> list[str]:
    exact = set(wordlist)
    by_lower: dict[str, str] = {}
    by_mask: dict[str, str] = {}
    for word in wordlist:
        lower = word.lower()
        by_lower.setdefault(lower, word)
        by_mask.setdefault(_mask(lower), word)
    answer = []
    for query in queries:
        if query in exact:
            answer.append(query)
            continue
        lower = query.lower()
        if lower in by_lower:
            answer.append(by_lower[lower])
        else:
            answer.append(by_mask.get(_mask(lower), ""))
    return answer
