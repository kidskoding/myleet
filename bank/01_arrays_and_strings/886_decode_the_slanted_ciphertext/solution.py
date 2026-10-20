def decode_ciphertext(encoded_text: str, rows: int) -> str:
    cols = len(encoded_text) // rows
    out: list[str] = []
    for start in range(cols):
        r, c = 0, start
        while r < rows and c < cols:
            out.append(encoded_text[r * cols + c])
            r += 1
            c += 1
    return "".join(out).rstrip(" ")
