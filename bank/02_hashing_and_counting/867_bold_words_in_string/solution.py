def bold_words(words: list[str], s: str) -> str:
    n = len(s)
    bold = [False] * n
    end = 0
    for i in range(n):
        for word in words:
            if s.startswith(word, i):
                end = max(end, i + len(word))
        bold[i] = end > i
    out: list[str] = []
    for i, ch in enumerate(s):
        if bold[i] and (i == 0 or not bold[i - 1]):
            out.append("<b>")
        out.append(ch)
        if bold[i] and (i == n - 1 or not bold[i + 1]):
            out.append("</b>")
    return "".join(out)
