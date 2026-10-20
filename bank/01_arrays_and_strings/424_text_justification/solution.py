def full_justify(words: list[str], max_width: int) -> list[str]:
    # Time: O(total characters).
    # Space: O(max_width) per line.
    lines: list[str] = []
    i, n = 0, len(words)
    while i < n:
        j = i
        length = 0
        while j < n and length + len(words[j]) + (j - i) <= max_width:
            length += len(words[j])
            j += 1
        gaps = j - i - 1
        if j == n or gaps == 0:
            line = " ".join(words[i:j])
            lines.append(line + " " * (max_width - len(line)))
        else:
            spaces, extra = divmod(max_width - length, gaps)
            parts = []
            for k in range(i, j - 1):
                parts.append(words[k])
                parts.append(" " * (spaces + (1 if k - i < extra else 0)))
            parts.append(words[j - 1])
            lines.append("".join(parts))
        i = j
    return lines
