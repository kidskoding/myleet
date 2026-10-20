from solution import lucky_numbers


def test_lucky_numbers_example_one():
    assert sorted(lucky_numbers([[3, 7, 8], [9, 11, 13], [15, 16, 17]])) == [15]


def test_lucky_numbers_example_two():
    assert sorted(lucky_numbers([[1, 10, 4, 2], [9, 3, 8, 7], [15, 16, 17, 12]])) == [12]


def test_lucky_numbers_example_three():
    assert sorted(lucky_numbers([[7, 8], [1, 2]])) == [7]


def test_lucky_numbers_single_cell():
    assert sorted(lucky_numbers([[5]])) == [5]


def test_lucky_numbers_none():
    assert lucky_numbers([[1, 4], [3, 2]]) == []
