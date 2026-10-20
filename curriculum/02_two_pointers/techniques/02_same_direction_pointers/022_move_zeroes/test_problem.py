from solution import move_zeroes


def test_move_zeroes_empty():
    nums: list[int] = []
    move_zeroes(nums)
    assert nums == []


def test_move_zeroes_single_zero():
    nums = [0]
    move_zeroes(nums)
    assert nums == [0]


def test_move_zeroes_normal():
    nums = [0, 1, 0, 3, 12]
    move_zeroes(nums)
    assert nums == [1, 3, 12, 0, 0]


def test_move_zeroes_no_zeroes():
    nums = [1, 2, 3]
    move_zeroes(nums)
    assert nums == [1, 2, 3]
