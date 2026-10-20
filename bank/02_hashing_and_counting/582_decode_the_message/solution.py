from string import ascii_lowercase


def decode_message(key: str, message: str) -> str:
    table = {" ": " "}
    for ch in key:
        if ch != " " and ch not in table:
            table[ch] = ascii_lowercase[len(table) - 1]
    return "".join(table[ch] for ch in message)
