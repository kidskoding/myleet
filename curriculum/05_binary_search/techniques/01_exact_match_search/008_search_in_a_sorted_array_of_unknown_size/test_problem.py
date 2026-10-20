from solution import ArrayReader, search_unknown_size


class _ListReader(ArrayReader):
    """Concrete stand-in; get returns 2^31 - 1 past the end, as the problem states."""

    def __init__(self, values: list[int]) -> None:
        self.values = values

    def get(self, index: int) -> int:
        return self.values[index] if 0 <= index < len(self.values) else 2**31 - 1


def test_search_unknown_size_found():
    assert search_unknown_size(_ListReader([-1, 0, 3, 5, 9, 12]), 9) == 4


def test_search_unknown_size_missing():
    assert search_unknown_size(_ListReader([-1, 0, 3, 5, 9, 12]), 2) == -1


def test_search_unknown_size_single_element():
    assert search_unknown_size(_ListReader([5]), 5) == 0
