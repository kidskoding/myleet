def buddy_strings(s: str, goal: str) -> bool:
    if len(s) != len(goal):
        return False
    if s == goal:
        return len(set(s)) < len(s)
    diffs = [i for i in range(len(s)) if s[i] != goal[i]]
    if len(diffs) != 2:
        return False
    i, j = diffs
    return s[i] == goal[j] and s[j] == goal[i]
