from collections import defaultdict


def find_duplicate(paths: list[str]) -> list[list[str]]:
    by_content: defaultdict[str, list[str]] = defaultdict(list)
    for entry in paths:
        directory, *files = entry.split(" ")
        for file in files:
            name, _, rest = file.partition("(")
            by_content[rest[:-1]].append(f"{directory}/{name}")
    return [group for group in by_content.values() if len(group) > 1]
