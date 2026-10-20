from collections import deque


class PhoneDirectory:
    def __init__(self, max_numbers: int) -> None:
        self.free: deque[int] = deque(range(max_numbers))
        self.available = set(range(max_numbers))

    def get(self) -> int:
        if not self.free:
            return -1
        number = self.free.popleft()
        self.available.discard(number)
        return number

    def check(self, number: int) -> bool:
        return number in self.available

    def release(self, number: int) -> None:
        if number not in self.available:
            self.available.add(number)
            self.free.append(number)
