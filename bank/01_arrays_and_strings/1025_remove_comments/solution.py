def remove_comments(source: list[str]) -> list[str]:
    result: list[str] = []
    in_block = False
    buffer: list[str] = []
    for line in source:
        i, n = 0, len(line)
        while i < n:
            if in_block:
                if line.startswith("*/", i):
                    in_block = False
                    i += 2
                else:
                    i += 1
            elif line.startswith("/*", i):
                in_block = True
                i += 2
            elif line.startswith("//", i):
                break
            else:
                buffer.append(line[i])
                i += 1
        if not in_block and buffer:
            result.append("".join(buffer))
            buffer = []
    return result
