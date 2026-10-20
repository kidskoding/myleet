def length_longest_path(input: str) -> int:
    lengths = [0]
    best = 0
    for line in input.split("\n"):
        name = line.lstrip("\t")
        depth = len(line) - len(name)
        del lengths[depth + 1 :]
        total = lengths[depth] + len(name)
        if "." in name:
            best = max(best, total)
        else:
            lengths.append(total + 1)
    return best
