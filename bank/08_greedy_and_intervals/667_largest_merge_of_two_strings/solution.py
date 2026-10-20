def largest_merge(word1: str, word2: str) -> str:
    i = j = 0
    out = []
    while i < len(word1) and j < len(word2):
        if word1[i:] > word2[j:]:
            out.append(word1[i])
            i += 1
        else:
            out.append(word2[j])
            j += 1
    out.append(word1[i:])
    out.append(word2[j:])
    return "".join(out)
