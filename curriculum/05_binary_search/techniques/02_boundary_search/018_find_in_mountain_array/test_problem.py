from solution import find_in_mountain_array


class _ArrayBackedMountain:
    """Concrete stand-in for the MountainArray interface the problem hands you."""

    def __init__(self, values: list[int]) -> None:
        self.values = values

    def get(self, index: int) -> int:
        return self.values[index]

    def length(self) -> int:
        return len(self.values)


def test_find_in_mountain_array_on_ascent():
    mountain = _ArrayBackedMountain([1, 2, 3, 4, 5, 3, 1])
    assert find_in_mountain_array(3, mountain) == 2


def test_find_in_mountain_array_missing():
    mountain = _ArrayBackedMountain([0, 1, 2, 4, 2, 1])
    assert find_in_mountain_array(3, mountain) == -1
