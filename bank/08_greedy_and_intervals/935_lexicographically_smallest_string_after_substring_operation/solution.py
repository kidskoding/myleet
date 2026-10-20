def smallest_string(s: str) -> str:
    chars = list(s)
    i = 0
    while i < len(chars) and chars[i] == "a":
        i += 1
    if i == len(chars):
        chars[-1] = "z"
        return "".join(chars)
    while i < len(chars) and chars[i] != "a":
        chars[i] = chr(ord(chars[i]) - 1)
        i += 1
    return "".join(chars)
