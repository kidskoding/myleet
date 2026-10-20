def add_bold_tag(s: str, words: list[str]) -> str:
    n = len(s)
    bold = [False] * n
    end = 0
    for i in range(n):
        for word in words:
            if s.startswith(word, i):
                end = max(end, i + len(word))
        bold[i] = end > i
    out: list[str] = []
    i = 0
    while i < n:
        if not bold[i]:
            out.append(s[i])
            i += 1
            continue
        j = i
        while j < n and bold[j]:
            j += 1
        out.append("<b>" + s[i:j] + "</b>")
        i = j
    return "".join(out)
