def get_folder_names(names: list[str]) -> list[str]:
    next_suffix: dict[str, int] = {}
    result = []
    for name in names:
        if name not in next_suffix:
            next_suffix[name] = 1
            result.append(name)
            continue
        k = next_suffix[name]
        while f"{name}({k})" in next_suffix:
            k += 1
        candidate = f"{name}({k})"
        next_suffix[name] = k + 1
        next_suffix[candidate] = 1
        result.append(candidate)
    return result
