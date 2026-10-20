from collections import Counter


def max_rep_opt1(text: str) -> int:
    total = Counter(text)
    runs: list[tuple[str, int]] = []
    for ch in text:
        if runs and runs[-1][0] == ch:
            runs[-1] = (ch, runs[-1][1] + 1)
        else:
            runs.append((ch, 1))
    best = max(min(length + 1, total[ch]) for ch, length in runs)
    for i in range(1, len(runs) - 1):
        left_ch, left_len = runs[i - 1]
        right_ch, right_len = runs[i + 1]
        if runs[i][1] == 1 and left_ch == right_ch:
            best = max(best, min(left_len + right_len + 1, total[left_ch]))
    return best
