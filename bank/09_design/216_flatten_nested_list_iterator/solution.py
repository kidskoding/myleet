from __future__ import annotations


class NestedInteger:
    # Provided helper: holds either a single integer or a list of NestedInteger.
    def __init__(self, value: int | list[NestedInteger]) -> None:
        self._value = value

    def is_integer(self) -> bool:
        return isinstance(self._value, int)

    def get_integer(self) -> int:
        assert isinstance(self._value, int)
        return self._value

    def get_list(self) -> list[NestedInteger]:
        assert isinstance(self._value, list)
        return self._value


class NestedIterator:
    def __init__(self, nested_list: list[NestedInteger]) -> None:
        self.stack = list(reversed(nested_list))

    def next(self) -> int:
        self.has_next()
        return self.stack.pop().get_integer()

    def has_next(self) -> bool:
        while self.stack:
            top = self.stack[-1]
            if top.is_integer():
                return True
            self.stack.pop()
            self.stack.extend(reversed(top.get_list()))
        return False
