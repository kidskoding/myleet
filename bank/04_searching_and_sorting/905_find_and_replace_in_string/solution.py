def find_replace_string(s: str, indices: list[int], sources: list[str], targets: list[str]) -> str:
    replace_at: dict[int, tuple[int, str]] = {}
    for index, source, target in zip(indices, sources, targets):
        if s.startswith(source, index):
            replace_at[index] = (len(source), target)
    out: list[str] = []
    i = 0
    while i < len(s):
        if i in replace_at:
            length, target = replace_at[i]
            out.append(target)
            i += length
        else:
            out.append(s[i])
            i += 1
    return "".join(out)
