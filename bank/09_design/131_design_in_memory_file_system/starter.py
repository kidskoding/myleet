class FileSystem:
    # Problem 131: Design In-Memory File System
    # Time:
    # Space:

    def __init__(self) -> None:
        raise NotImplementedError

    def ls(self, path: str) -> list[str]:
        raise NotImplementedError

    def mkdir(self, path: str) -> None:
        raise NotImplementedError

    def add_content_to_file(self, file_path: str, content: str) -> None:
        raise NotImplementedError

    def read_content_from_file(self, file_path: str) -> str:
        raise NotImplementedError
