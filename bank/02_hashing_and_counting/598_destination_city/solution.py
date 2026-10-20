def dest_city(paths: list[list[str]]) -> str:
    starts = {start for start, _ in paths}
    return next(end for _, end in paths if end not in starts)
