import heapq
from collections import defaultdict


class FileSharing:
    def __init__(self, m: int) -> None:
        self.m = m
        self.next_id = 1
        self.free_ids: list[int] = []
        self.chunks_of: dict[int, set[int]] = {}
        self.owners_of: defaultdict[int, set[int]] = defaultdict(set)

    def join(self, owned_chunks: list[int]) -> int:
        if self.free_ids:
            user_id = heapq.heappop(self.free_ids)
        else:
            user_id = self.next_id
            self.next_id += 1
        self.chunks_of[user_id] = set(owned_chunks)
        for chunk in owned_chunks:
            self.owners_of[chunk].add(user_id)
        return user_id

    def leave(self, user_id: int) -> None:
        for chunk in self.chunks_of.pop(user_id):
            self.owners_of[chunk].discard(user_id)
        heapq.heappush(self.free_ids, user_id)

    def request(self, user_id: int, chunk_id: int) -> list[int]:
        owners = sorted(self.owners_of[chunk_id])
        if owners:
            self.owners_of[chunk_id].add(user_id)
            self.chunks_of[user_id].add(chunk_id)
        return owners
