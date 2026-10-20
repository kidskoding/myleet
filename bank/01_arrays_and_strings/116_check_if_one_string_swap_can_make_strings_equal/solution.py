def are_almost_equal(s1: str, s2: str) -> bool:
    diff = [i for i in range(len(s1)) if s1[i] != s2[i]]
    if not diff:
        return True
    if len(diff) != 2:
        return False
    i, j = diff
    return s1[i] == s2[j] and s1[j] == s2[i]
