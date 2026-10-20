import re
from functools import cache

PLACEHOLDER = re.compile(r"%([A-Z])%")


def apply_substitutions(replacements: list[list[str]], text: str) -> str:
    raw = {key: value for key, value in replacements}

    @cache
    def expand(key: str) -> str:
        return PLACEHOLDER.sub(lambda m: expand(m.group(1)), raw[key])

    return PLACEHOLDER.sub(lambda m: expand(m.group(1)), text)
