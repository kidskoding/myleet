from problem_set.demo_problems import Codec, Reader, three_sum, two_sum


def _board() -> list[int]:
    return [1, 2, 3]


class _ListReader(Reader):
    def __init__(self, values: list[int]) -> None:
        self.values = values

    def get(self, index: int) -> int:
        return self.values[index]


def test_two_sum_basic():
    assert two_sum([2, 7, 11, 15], 9) == [0, 1]


def test_two_sum_pair_at_end():
    assert two_sum([1, 2, 3], 5) == [1, 2]


def test_three_sum_board():
    assert three_sum(_ListReader(_board()), 3) == []


def test_codec_roundtrip():
    codec = Codec()
    assert codec.decode(codec.encode(["a", "bc"])) == ["a", "bc"]
