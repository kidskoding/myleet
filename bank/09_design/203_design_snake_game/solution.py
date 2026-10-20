from collections import deque

DIRECTIONS = {"U": (-1, 0), "D": (1, 0), "L": (0, -1), "R": (0, 1)}


class SnakeGame:
    def __init__(self, width: int, height: int, food: list[list[int]]) -> None:
        self.width = width
        self.height = height
        self.food = food
        self.food_index = 0
        self.body: deque[tuple[int, int]] = deque([(0, 0)])
        self.occupied = {(0, 0)}

    def move(self, direction: str) -> int:
        dr, dc = DIRECTIONS[direction]
        row, col = self.body[0]
        head = (row + dr, col + dc)
        if not (0 <= head[0] < self.height and 0 <= head[1] < self.width):
            return -1
        if self.food_index < len(self.food) and list(head) == self.food[self.food_index]:
            self.food_index += 1
        else:
            self.occupied.discard(self.body.pop())
        if head in self.occupied:
            return -1
        self.body.appendleft(head)
        self.occupied.add(head)
        return len(self.body) - 1
