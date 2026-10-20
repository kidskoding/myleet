def transform_str(s: str, strs: list[str]) -> list[bool]:
    ones = s.count("1")
    prefix_s = []
    running = 0
    for ch in s:
        running += ch == "1"
        prefix_s.append(running)

    answer = []
    for t in strs:
        need = ones - t.count("1")
        unknown = t.count("?")
        if need < 0 or need > unknown:
            answer.append(False)
            continue
        zeros_from_unknown = unknown - need
        running = 0
        ok = True
        for i, ch in enumerate(t):
            if ch == "?":
                if zeros_from_unknown:
                    zeros_from_unknown -= 1
                else:
                    running += 1
            elif ch == "1":
                running += 1
            if running > prefix_s[i]:
                ok = False
                break
        answer.append(ok)
    return answer
