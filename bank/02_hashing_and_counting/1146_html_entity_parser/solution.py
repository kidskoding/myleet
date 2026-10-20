ENTITIES = {
    "&quot;": '"',
    "&apos;": "'",
    "&amp;": "&",
    "&gt;": ">",
    "&lt;": "<",
    "&frasl;": "/",
}


def entity_parser(text: str) -> str:
    out: list[str] = []
    i = 0
    while i < len(text):
        if text[i] == "&":
            for entity, char in ENTITIES.items():
                if text.startswith(entity, i):
                    out.append(char)
                    i += len(entity)
                    break
            else:
                out.append("&")
                i += 1
        else:
            out.append(text[i])
            i += 1
    return "".join(out)
