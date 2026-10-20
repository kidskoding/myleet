from solution import shortest_subarray


def test_shortest_subarray_single():
    assert shortest_subarray([1], 1) == 1


def test_shortest_subarray_impossible():
    assert shortest_subarray([1, 2], 4) == -1


def test_shortest_subarray_with_negative():
    assert shortest_subarray([2, -1, 2], 3) == 3


def test_shortest_subarray_normal():
    assert shortest_subarray([84, -37, 32, 40, 95], 167) == 3
