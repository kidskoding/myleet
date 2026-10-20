from solution import length_of_lis


def test_length_of_lis_empty():
    assert length_of_lis([]) == 0


def test_length_of_lis_normal():
    assert length_of_lis([10, 9, 2, 5, 3, 7, 101, 18]) == 4


def test_length_of_lis_strictly_decreasing():
    assert length_of_lis([5, 4, 3, 2, 1]) == 1
