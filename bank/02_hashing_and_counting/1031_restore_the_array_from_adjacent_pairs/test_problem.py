from solution import restore_array


def check(pairs: list[list[int]], expected: list[int]) -> None:
    result = restore_array(pairs)
    assert result == expected or result == expected[::-1]


def test_restore_array_example_one():
    check([[2, 1], [3, 4], [3, 2]], [1, 2, 3, 4])


def test_restore_array_negative_values():
    check([[4, -2], [1, 4], [-3, 1]], [-2, 4, 1, -3])


def test_restore_array_single_pair():
    check([[100000, -100000]], [100000, -100000])


def test_restore_array_shuffled_long_chain():
    check([[5, 6], [1, 2], [4, 5], [2, 3], [3, 4]], [1, 2, 3, 4, 5, 6])


def test_restore_array_with_zero():
    check([[0, 7], [9, 0]], [7, 0, 9])
