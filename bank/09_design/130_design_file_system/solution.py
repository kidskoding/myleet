class FileSystem:
    def __init__(self) -> None:
        self.paths: dict[str, int] = {}

    def create_path(self, path: str, value: int) -> bool:
        if path in self.paths:
            return False
        parent = path[: path.rfind("/")]
        if parent and parent not in self.paths:
            return False
        self.paths[path] = value
        return True

    def get(self, path: str) -> int:
        return self.paths.get(path, -1)
