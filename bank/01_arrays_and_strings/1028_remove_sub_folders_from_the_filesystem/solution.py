def remove_subfolders(folder: list[str]) -> list[str]:
    kept: list[str] = []
    for path in sorted(folder):
        if not kept or not path.startswith(kept[-1] + "/"):
            kept.append(path)
    return kept
