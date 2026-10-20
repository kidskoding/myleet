def is_valid(code: str) -> bool:
    stack: list[str] = []
    i, n = 0, len(code)
    while i < n:
        if i > 0 and not stack:
            return False
        if code.startswith("<![CDATA[", i):
            if not stack:
                return False
            j = code.find("]]>", i + 9)
            if j < 0:
                return False
            i = j + 3
        elif code.startswith("</", i):
            j = code.find(">", i + 2)
            if j < 0:
                return False
            if not stack or stack[-1] != code[i + 2 : j]:
                return False
            stack.pop()
            i = j + 1
        elif code[i] == "<":
            j = code.find(">", i + 1)
            if j < 0:
                return False
            name = code[i + 1 : j]
            if not 1 <= len(name) <= 9 or not all("A" <= c <= "Z" for c in name):
                return False
            stack.append(name)
            i = j + 1
        else:
            if not stack:
                return False
            i += 1
    return not stack
