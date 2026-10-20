class FileSharing:
    # Problem 588: Design a File Sharing System
    # Time:
    # Space:

    def __init__(self, m: int) -> None:
        raise NotImplementedError

    def join(self, owned_chunks: list[int]) -> int:
        raise NotImplementedError

    def leave(self, user_id: int) -> None:
        raise NotImplementedError

    def request(self, user_id: int, chunk_id: int) -> list[int]:
        raise NotImplementedError
