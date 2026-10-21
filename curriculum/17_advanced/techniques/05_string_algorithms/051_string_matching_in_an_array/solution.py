def string_matching(words: list[str]) -> list[str]:
    # Problem 51: String Matching in an Array
    # Time: O(n^2 * L)
    # Space: O(n)

    ans: list[str] = []
    for i, w in enumerate(words):
        for j, other in enumerate(words):
            if i != j and w in other:
                ans.append(w)
                break
    return ans
