BELOW_TWENTY = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
]
TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
SCALES = ["", "Thousand", "Million", "Billion"]


def _chunk(n: int) -> list[str]:
    words = []
    if n >= 100:
        words += [BELOW_TWENTY[n // 100], "Hundred"]
        n %= 100
    if n >= 20:
        words.append(TENS[n // 10])
        n %= 10
    if n:
        words.append(BELOW_TWENTY[n])
    return words


def number_to_words(num: int) -> str:
    if num == 0:
        return "Zero"
    parts: list[str] = []
    scale = 0
    while num:
        num, chunk = divmod(num, 1000)
        if chunk:
            parts = _chunk(chunk) + ([SCALES[scale]] if SCALES[scale] else []) + parts
        scale += 1
    return " ".join(parts)
