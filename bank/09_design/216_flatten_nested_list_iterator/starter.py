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
    # Problem 216: Flatten Nested List Iterator

    def __init__(self, nested_list: list[NestedInteger]) -> None:
        # Time:
        # Space:
        raise NotImplementedError

    def next(self) -> int:
        # Time:
        # Space:
        raise NotImplementedError

    def has_next(self) -> bool:
        # Time:
        # Space:
        raise NotImplementedError
