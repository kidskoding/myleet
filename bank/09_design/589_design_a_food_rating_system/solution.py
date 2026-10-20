import heapq
from collections import defaultdict


class FoodRatings:
    def __init__(self, foods: list[str], cuisines: list[str], ratings: list[int]) -> None:
        self.rating: dict[str, int] = {}
        self.cuisine_of: dict[str, str] = {}
        self.heaps: defaultdict[str, list[tuple[int, str]]] = defaultdict(list)
        for food, cuisine, rating in zip(foods, cuisines, ratings):
            self.rating[food] = rating
            self.cuisine_of[food] = cuisine
            self.heaps[cuisine].append((-rating, food))
        for heap in self.heaps.values():
            heapq.heapify(heap)

    def change_rating(self, food: str, new_rating: int) -> None:
        self.rating[food] = new_rating
        heapq.heappush(self.heaps[self.cuisine_of[food]], (-new_rating, food))

    def highest_rated(self, cuisine: str) -> str:
        heap = self.heaps[cuisine]
        while -heap[0][0] != self.rating[heap[0][1]]:
            heapq.heappop(heap)
        return heap[0][1]
