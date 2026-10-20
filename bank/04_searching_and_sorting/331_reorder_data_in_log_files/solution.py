def reorder_log_files(logs: list[str]) -> list[str]:
    def key(log: str) -> tuple:
        identifier, content = log.split(" ", 1)
        if content[0].isdigit():
            return (1,)
        return (0, content, identifier)

    return sorted(logs, key=key)
